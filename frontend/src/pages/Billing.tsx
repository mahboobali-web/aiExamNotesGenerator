import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import {
  Check,
  AlertCircle,
  Sparkles,
  Plus,
  Ban,
  Download,
  FileText,
  HelpCircle,
  Activity,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

interface Plan {
  id: string;
  name: string;
  subtitle: string;
  credits: number;
  price: string;
  description: string;
  features: { text: string; enabled: boolean }[];
  popular?: boolean;
}

export default function Billing() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    fetchUserCredits();
    fetchBillingActivity();
  }, []);

  const fetchUserCredits = async () => {
    try {
      const response = await api.post('/auth/sync');
      setCredits(response.data.user.freeCredits);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError('Could not load credit balance.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingActivity = async () => {
    try {
      const [txRes, notesRes] = await Promise.all([
        api.get('/checkout/history').catch(() => ({ data: { transactions: [] } })),
        api.get('/notes').catch(() => ({ data: { notes: [] } }))
      ]);

      const txs = txRes.data.transactions || [];
      const notesList = notesRes.data.notes || [];

      // Map completed transactions (credit additions)
      const mappedTxs = txs.map((tx: any) => ({
        id: tx._id,
        title: `${tx.packageName} Purchase`,
        subtitle: tx.cardLast4 && tx.cardLast4 !== '••••' ? `Card ending in ${tx.cardLast4}` : `Invoice INV-${tx._id.slice(-6).toUpperCase()}`,
        status: tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Pending' : 'Failed',
        credits: tx.creditsAdded,
        creditsColor: 'text-emerald-400',
        creditsPrefix: '+',
        date: new Date(tx.createdAt),
        amount: `$${tx.amount.toFixed(2)}`,
        isCredit: true
      }));

      // Map generated notes as usage (-1 credit per note)
      const mappedNotes = notesList.map((note: any) => ({
        id: note._id,
        title: `${note.topic} Notes Generation`,
        subtitle: `Exam Prep: ${note.examType || 'General'}`,
        status: 'Used',
        credits: 1,
        creditsColor: 'text-rose-400',
        creditsPrefix: '-',
        date: new Date(note.createdAt),
        amount: '—',
        isCredit: false
      }));

      // Merge and sort chronologically by date descending
      const merged = [...mappedTxs, ...mappedNotes].sort((a, b) => b.date.getTime() - a.date.getTime());
      setActivity(merged);
    } catch (err) {
      console.error('Error fetching billing activity:', err);
    }
  };

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const handlePurchase = async (creditsAmount: number, planId: string) => {
    setCheckoutLoading(planId);
    setError(null);
    try {
      const response = await api.post('/checkout/create-checkout-session', {
        creditsAmount,
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout session URL received');
      }
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      setError(err.response?.data?.error || 'Failed to initialize payment. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      subtitle: 'Perfect for light study',
      credits: 100,
      price: '$19',
      description: '/ one-time',
      features: [
        { text: 'AI Document Summaries', enabled: true },
        { text: 'Flashcard Generation', enabled: true },
        { text: 'Priority Processing', enabled: false },
      ],
    },
    {
      id: 'scholar',
      name: 'Scholar Pack',
      subtitle: 'The best value for students',
      credits: 300,
      price: '$49',
      description: '/ one-time',
      popular: true,
      features: [
        { text: 'AI Document Summaries', enabled: true },
        { text: 'Unlimited Flashcards', enabled: true },
        { text: 'Priority Processing', enabled: true },
      ],
    },
    {
      id: 'genius',
      name: 'Genius Pack',
      subtitle: 'Pro tools for academics',
      credits: 750,
      price: '$99',
      description: '/ one-time',
      features: [
        { text: 'All Scholar Features', enabled: true },
        { text: 'Custom AI Model Training', enabled: true },
        { text: 'Bulk Document Import', enabled: true },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-[1200px] mx-auto py-4 pb-8 space-y-12 select-none"
    >
      
      {/* ─── Top Billing & Plan Card ─── */}
      <div className="bg-[#131b2e] rounded-[24px] border border-white/[0.06] p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
        <div className="space-y-3 text-left max-w-2xl">
          <h1
            className="text-[32px] font-extrabold text-white tracking-tight leading-none"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            Billing & Plan
          </h1>
          <p className="text-gray-400 text-[14px] leading-relaxed font-medium">
            Manage your account balance and subscription level.
            <br />
            Credits are used for AI analysis and document generation.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0 w-full md:w-auto">
          <div className="flex flex-col text-left md:text-right">
            <span className="text-[54px] font-black text-white leading-none tracking-tight">
              {loading ? '...' : (credits ?? 0)}
            </span>
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-2">
              CREDITS AVAILABLE
            </span>
          </div>
          <Button
            onClick={() => {
              const element = document.getElementById('purchase-section');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-10 px-6 rounded-xl text-[12px] font-extrabold bg-[#8083ff] hover:brightness-110 text-white shadow-lg shadow-indigo-500/10 border-0 w-full md:w-auto"
          >
            Recharge Balance
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-450" />
          <p className="font-semibold text-rose-455">{error}</p>
        </motion.div>
      )}

      {/* ─── Purchase Credits Grid Section ─── */}
      <div id="purchase-section" className="space-y-6 scroll-mt-6 select-none">
        <div className="text-left">
          <h2 className="text-[20px] font-bold text-white tracking-tight">Purchase Credits</h2>
          <p className="text-gray-500 text-[13px] font-medium mt-1">
            Top up your account with specialized credit packs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.popular;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-[24px] border p-8 transition-all duration-300 ${
                  isPopular
                    ? 'bg-[#131b2e] border-[#8083ff]/40 shadow-2xl shadow-indigo-500/[0.04] ring-1 ring-[#8083ff]/15'
                    : 'bg-[#131b2e] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8083ff] text-white text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md shadow-indigo-500/10 whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                    <p className="text-[12px] text-gray-500 font-medium mt-1">{plan.subtitle}</p>
                  </div>

                  <div className="mt-6 text-left flex items-baseline gap-1.5">
                    <span className="text-[34px] font-black text-white leading-none tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 text-[12px] font-medium">
                      {plan.description}
                    </span>
                  </div>

                  <div className="text-left mt-3">
                    <span className="text-[14px] font-bold text-white">
                      {plan.credits} Credits
                    </span>
                  </div>

                  <div className="h-[1px] bg-white/[0.04] my-6" />

                  <ul className="space-y-4 text-left">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-3 text-[12px] font-medium leading-none ${
                          feature.enabled ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        {feature.enabled ? (
                          <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <Ban className="w-4 h-4 text-gray-700 shrink-0" />
                        )}
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isPopular ? (
                    <Button
                      onClick={() => handlePurchase(plan.credits, plan.id)}
                      disabled={checkoutLoading !== null}
                      className="w-full h-11 text-xs font-bold rounded-xl bg-[#c0c1ff] hover:brightness-110 text-[#1000a9] border-0 transition-all shadow-md shadow-indigo-500/5 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {checkoutLoading === plan.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 rounded-full border-2 border-indigo-900/30 border-t-indigo-900"
                        />
                      ) : (
                        'Buy Credits'
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(plan.credits, plan.id)}
                      disabled={checkoutLoading !== null}
                      variant="ghost"
                      className="w-full h-11 text-xs font-bold rounded-xl text-white border border-white/[0.08] hover:bg-white/5 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {checkoutLoading === plan.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                      ) : (
                        'Buy Credits'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Recent Activity Table Section ─── */}
      <div className="space-y-6 select-none">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h2 className="text-[20px] font-bold text-white tracking-tight">Recent Activity</h2>
          </div>
          <button
            onClick={() => {
              if (activity.length === 0) return;
              const headers = ['Transaction', 'Status', 'Credits', 'Date', 'Amount'];
              const rows = activity.map(act => [
                act.title,
                act.status,
                `${act.creditsPrefix}${act.credits}`,
                formatDate(act.date),
                act.amount
              ]);
              const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "billing_activity.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            disabled={activity.length === 0}
            className={`flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-[#131b2e]/60 px-4.5 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.1] active:scale-[0.97] ${
              activity.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Export CSV
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Premium Table Container */}
        <div className="border border-white/[0.06] bg-[#131b2e]/60 backdrop-blur-md rounded-[20px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] bg-[#0c1324]/40 select-none">
                  <th className="py-4.5 px-6 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    TRANSACTION
                  </th>
                  <th className="py-4.5 px-6 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    STATUS
                  </th>
                  <th className="py-4.5 px-6 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    CREDITS
                  </th>
                  <th className="py-4.5 px-6 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    DATE
                  </th>
                  <th className="py-4.5 px-6 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {activity.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-gray-500 font-medium">
                      No billing activity or usage records found.
                    </td>
                  </tr>
                ) : (
                  activity.slice(0, visibleCount).map((act) => (
                    <tr key={act.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-4">
                          {act.isCredit ? (
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/15">
                              <Plus className="w-4.5 h-4.5 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/15">
                              <FileText className="w-4.5 h-4.5 text-indigo-400" />
                            </div>
                          )}
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-bold text-white">{act.title}</span>
                            <span className="text-[10px] text-gray-500 font-medium mt-0.5">{act.subtitle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-6">
                        {act.isCredit ? (
                          <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            act.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                            act.status === 'Pending' ? 'bg-violet-500/10 text-violet-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {act.status}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400">
                            Used
                          </span>
                        )}
                      </td>
                      <td className={`py-4.5 px-6 font-bold text-sm ${act.creditsColor}`}>
                        {act.creditsPrefix}{act.credits}
                      </td>
                      <td className="py-4.5 px-6 text-xs text-gray-400 font-semibold">
                        {formatDate(act.date)}
                      </td>
                      <td className={`py-4.5 px-6 text-sm font-bold ${act.isCredit ? 'text-white' : 'text-gray-500'}`}>
                        {act.amount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Trigger */}
          {activity.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => prev + 5)}
              className="w-full text-center py-4 border-t border-white/[0.04] text-[12px] font-bold text-gray-500 hover:text-white transition-colors bg-[#0c1324]/20 hover:bg-[#0c1324]/40"
            >
              Load More History
            </button>
          )}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="pt-8 border-t border-white/[0.04]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <span className="font-bold text-white text-sm tracking-tight font-sans">ExamNotes AI</span>
            <span className="text-gray-600 text-xs">© 2024 ExamNotes AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Contact Support</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">API Documentation</a>
          </div>
        </div>
      </footer>

    </motion.div>
  );
}
