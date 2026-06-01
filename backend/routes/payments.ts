import express from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { stripe } from '../services/stripe';
import User from '../models/User';
import Transaction from '../models/Transaction';

const router = express.Router();

// Create checkout session for purchasing credits
router.post('/create-checkout-session', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { creditsAmount } = req.body; // e.g., 10, 50, 150
    const { uid } = req.user;
    
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Set precise package pricing and description to match the frontend
    let amount = 1900; // Starter Pack by default ($19.00)
    let packageName = 'Starter Pack';
    
    if (creditsAmount === 300) {
      amount = 4900; // Scholar Pack ($49.00)
      packageName = 'Scholar Pack';
    } else if (creditsAmount === 750) {
      amount = 9900; // Genius Pack ($99.00)
      packageName = 'Genius Pack';
    } else if (creditsAmount === 100) {
      amount = 1900;
      packageName = 'Starter Pack';
    } else {
      amount = creditsAmount * 100; // dynamic fallback $1/credit
      packageName = `${creditsAmount} AI Generation Credits`;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageName,
              description: `Includes ${creditsAmount} AI generation credits. No expiration.`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5173/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/billing?canceled=true`,
      metadata: {
        userId: user._id.toString(),
        credits: creditsAmount.toString(),
      },
    });

    // Save a pending transaction
    const transaction = new Transaction({
      userId: user._id,
      amount: amount / 100,
      creditsAdded: creditsAmount,
      stripeSessionId: session.id,
      stripePaymentIntentId: '',
      packageName,
      status: 'pending',
    });
    await transaction.save();

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify a Stripe checkout session from the frontend success page immediately
router.post('/verify-session', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve Stripe Session safely without immediate expansion to avoid API issues
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Session is not paid' });
    }

    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0');

    if (!userId || !credits) {
      return res.status(400).json({ error: 'Invalid session metadata' });
    }

    // Atomically find and mark the transaction as completed to prevent double-crediting
    let transaction = await Transaction.findOneAndUpdate(
      { stripeSessionId: sessionId, status: 'pending' },
      { $set: { status: 'completed' } },
      { new: true }
    );

    let alreadyCredited = false;

    if (!transaction) {
      // Check if it was already marked completed (by webhook or concurrent request)
      const existingTx = await Transaction.findOne({ stripeSessionId: sessionId });
      if (existingTx && existingTx.status === 'completed') {
        alreadyCredited = true;
        transaction = existingTx;
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only add credits if NOT already credited
    if (!alreadyCredited) {
      user.freeCredits += credits;
      await user.save();
      console.log(`✅ Session verified & credited: +${credits} credits added to user ${user.email}`);
    } else {
      console.log(`ℹ️ Session ${sessionId} already credited. Skipping credit addition.`);
    }

    // Safely extract card details in a separate try-catch block
    let cardBrand = 'card';
    let cardLast4 = '••••';
    try {
      if (session.payment_intent) {
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
        const paymentIntent = await stripe.paymentIntents.retrieve(piId, {
          expand: ['payment_method'],
        });
        const paymentMethod = paymentIntent?.payment_method as any;
        if (paymentMethod?.card) {
          cardBrand = paymentMethod.card.brand || 'card';
          cardLast4 = paymentMethod.card.last4 || '••••';
        }
      }
    } catch (cardErr) {
      console.warn('⚠️ Warning: Failed to extract card details from payment intent:', cardErr);
    }

    // Complete saving transaction history
    if (!transaction) {
      transaction = new Transaction({
        userId: user._id,
        amount: (session.amount_total || 0) / 100,
        creditsAdded: credits,
        stripeSessionId: sessionId,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id || '',
        packageName: credits === 300 ? 'Scholar Pack' : credits === 750 ? 'Genius Pack' : 'Starter Pack',
        cardBrand,
        cardLast4,
        status: 'completed',
      });
    } else {
      transaction.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id || '';
      transaction.cardBrand = cardBrand;
      transaction.cardLast4 = cardLast4;
    }
    await transaction.save();

    res.json({ 
      success: true, 
      message: alreadyCredited ? 'Payment already verified' : 'Payment verified and credits added successfully', 
      credits: user.freeCredits, 
      transaction 
    });
  } catch (error: any) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get user's purchase transaction history
router.get('/history', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json({ transactions });
  } catch (error) {
    console.error('Fetch transaction history error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// Stripe webhook (secondary backup listener for production or CLI forwarding)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const sessionId = session.id;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0');

    if (userId && credits) {
      // Atomically complete the transaction to prevent race conditions
      let transaction = await Transaction.findOneAndUpdate(
        { stripeSessionId: sessionId, status: 'pending' },
        { $set: { status: 'completed' } },
        { new: true }
      );

      let alreadyCredited = false;

      if (!transaction) {
        const existingTx = await Transaction.findOne({ stripeSessionId: sessionId });
        if (existingTx && existingTx.status === 'completed') {
          alreadyCredited = true;
          transaction = existingTx;
        }
      }

      const user = await User.findById(userId);
      if (user) {
        if (!alreadyCredited) {
          user.freeCredits += credits;
          await user.save();
          console.log(`Webhook: Added ${credits} credits to user ${userId}`);
        } else {
          console.log(`Webhook: Session ${sessionId} already credited. Skipping credit addition.`);
        }

        // Safe card details extraction
        let cardBrand = 'card';
        let cardLast4 = '••••';
        try {
          if (session.payment_intent) {
            const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
            const paymentIntent = await stripe.paymentIntents.retrieve(piId, {
              expand: ['payment_method'],
            });
            const paymentMethod = paymentIntent?.payment_method as any;
            if (paymentMethod?.card) {
              cardBrand = paymentMethod.card.brand || 'card';
              cardLast4 = paymentMethod.card.last4 || '••••';
            }
          }
        } catch (cardErr) {
          console.warn('Webhook warning: Failed to extract card details:', cardErr);
        }

        if (!transaction) {
          transaction = new Transaction({
            userId: user._id,
            amount: (session.amount_total || 0) / 100,
            creditsAdded: credits,
            stripeSessionId: sessionId,
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
            packageName: credits === 300 ? 'Scholar Pack' : credits === 750 ? 'Genius Pack' : 'Starter Pack',
            cardBrand,
            cardLast4,
            status: 'completed',
          });
        } else {
          transaction.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '';
          transaction.cardBrand = cardBrand;
          transaction.cardLast4 = cardLast4;
        }
        await transaction.save();
      }
    }
  }

  res.json({ received: true });
});

export default router;
