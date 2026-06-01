import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY !== 'your-stripe-secret-key' && process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY : 'sk_test_123', {
});
