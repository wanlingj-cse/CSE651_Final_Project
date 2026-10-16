// ============================================================================
// PETERS' BAKERY REWARDS — SUPABASE SERVERLESS BACKEND
// Handles Customer Data, Spends, 90-Day Credit Expiration & 7-Day Reminder
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Environment variables or fallback
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action || (req.body && req.body.action);

  try {
    switch (action) {
      // 1. REGISTER CUSTOMER
      case 'register': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { name, email, password, phone, favorite_treat, app_notify } = req.body || {};

        if (!name || !email || !password) {
          return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const memberId = `PB-${Math.floor(1000 + Math.random() * 9000)}-GOLD`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days expiration!

        let customer = {
          member_id: memberId,
          name,
          email: email.toLowerCase().trim(),
          password_hash: password, // In production, hash with bcrypt
          phone: phone || '',
          favorite_treat: favorite_treat || 'Burnt Almond Cake',
          app_notify: app_notify !== false,
          created_at: now.toISOString()
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('customers')
            .insert([customer])
            .select()
            .single();

          if (error) {
            // If duplicate email or other error
            if (error.code === '23505') {
              return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
            }
            console.error('Supabase insert customer error:', error);
          } else {
            customer = data;
          }
        }

        // Grant a $1.00 Welcome Credit expiring in 90 days
        const welcomeSpend = {
          customer_email: customer.email,
          order_description: 'Welcome Bonus for Joining Peters Bakery Rewards',
          spend_amount: 0.00,
          credit_rate: 0.01,
          credit_earned: 1.00, // $1.00 credit
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_redeemed: false
        };

        if (supabase) {
          await supabase.from('customer_spends').insert([welcomeSpend]);
        }

        return res.status(200).json({
          success: true,
          message: 'Account registered successfully!',
          customer: {
            member_id: customer.member_id,
            name: customer.name,
            email: customer.email,
            favorite_treat: customer.favorite_treat
          },
          rewards: {
            balance: 1.00,
            qualifying_orders: 0,
            lifetime_credit: 1.00,
            credits_expire_days: 90
          },
          spends: [welcomeSpend],
          expiring_soon_alert: null,
          backend: supabase ? 'supabase' : 'mock-active'
        });
      }

      // 2. LOGIN CUSTOMER & CHECK 7-DAY EXPIRATION
      case 'login': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { email, password } = req.body || {};

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let customer = null;
        let spends = [];

        if (supabase) {
          const { data: custData, error: custErr } = await supabase
            .from('customers')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

          if (custErr || !custData) {
            return res.status(401).json({ error: 'No account found with this email address' });
          }

          if (custData.password_hash !== password) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
          }

          customer = custData;

          const { data: spendsData } = await supabase
            .from('customer_spends')
            .select('*')
            .eq('customer_email', normalizedEmail)
            .order('created_at', { ascending: false });

          spends = spendsData || [];
        } else {
          // Demo fallback when live DB not yet provisioned
          customer = {
            member_id: 'PB-8849-GOLD',
            name: normalizedEmail.split('@')[0].replace('.', ' '),
            email: normalizedEmail,
            favorite_treat: 'Burnt Almond Cake'
          };
          spends = req.body.local_spends || [];
        }

        // Calculate 90-day active balance & check 7-day expiration reminder
        const now = new Date();
        const nowMs = now.getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        let activeBalance = 0.00;
        let lifetimeEarned = 0.00;
        let qualifyingOrdersCount = 0;
        let expiringSoonCredits = 0.00;
        let nearestExpiryDate = null;
        let nearestExpiryDays = 999;

        const evaluatedSpends = spends.map((sp) => {
          const expiryDate = new Date(sp.expires_at || (new Date(sp.created_at).getTime() + 90 * 24 * 60 * 60 * 1000));
          const diffMs = expiryDate.getTime() - nowMs;
          const daysLeft = Math.round((diffMs / (24 * 60 * 60 * 1000)) * 10) / 10;
          const isExpired = diffMs <= 0;
          const credit = Number(sp.credit_earned) || 0;

          if (credit > 0) {
            lifetimeEarned += credit;
          }
          if (Number(sp.spend_amount) >= 25.00) {
            qualifyingOrdersCount++;
          }

          if (!isExpired && !sp.is_redeemed) {
            activeBalance += credit;

            // Check if positive credit expiring in 7 days or less!
            if (credit > 0 && diffMs > 0 && diffMs <= sevenDaysMs) {
              expiringSoonCredits += credit;
              if (daysLeft < nearestExpiryDays) {
                nearestExpiryDays = daysLeft;
                nearestExpiryDate = expiryDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
              }
            }
          }

          return {
            ...sp,
            days_left: daysLeft,
            is_expired: isExpired,
            is_expiring_soon: diffMs > 0 && diffMs <= sevenDaysMs && credit > 0
          };
        });

        // 7-Day Expiration Reminder Object
        let expiringSoonAlert = null;
        if (expiringSoonCredits > 0) {
          expiringSoonAlert = {
            has_expiring: true,
            expiring_amount: Math.round(expiringSoonCredits * 100) / 100,
            days_remaining: Math.max(1, Math.ceil(nearestExpiryDays)),
            expiry_date: nearestExpiryDate,
            reminder_message: `⏰ Reminder: You have $${expiringSoonCredits.toFixed(2)} in rewards credit expiring in ${Math.max(1, Math.ceil(nearestExpiryDays))} days (${nearestExpiryDate})! Don't let your savings disappear—redeem on your next bakery order!`
          };
        }

        const safeBalance = Math.max(0, Math.round(activeBalance * 100) / 100);

        return res.status(200).json({
          success: true,
          customer: {
            member_id: customer.member_id,
            name: customer.name,
            email: customer.email,
            favorite_treat: customer.favorite_treat
          },
          rewards: {
            balance: safeBalance,
            qualifying_orders: qualifyingOrdersCount,
            lifetime_credit: Math.round(lifetimeEarned * 100) / 100,
            credits_expire_days: 90
          },
          spends: evaluatedSpends,
          expiring_soon_alert: expiringSoonAlert,
          backend: supabase ? 'supabase' : 'mock-active'
        });
      }

      // 3. RECORD CUSTOMER SPEND ($25+ earns 1%, expires in 90 days)
      case 'record_spend': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { email, amount, description, simulate_days_ago } = req.body || {};

        if (!email || amount === undefined) {
          return res.status(400).json({ error: 'Email and amount are required' });
        }

        const spendAmount = parseFloat(amount) || 0.00;
        const normalizedEmail = email.toLowerCase().trim();

        // 1% credit on purchases of $25 or above
        let creditEarned = 0.00;
        if (spendAmount >= 25.00) {
          creditEarned = Math.round(spendAmount * 0.01 * 100) / 100;
        }

        // Base date (allow simulate_days_ago for testing 85-day old spend!)
        const daysAgo = parseInt(simulate_days_ago, 10) || 0;
        const createdDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        // Credits expire in 90 days from purchase!
        const expiresDate = new Date(createdDate.getTime() + 90 * 24 * 60 * 60 * 1000);

        const newSpend = {
          customer_email: normalizedEmail,
          order_description: description || `Bakery Purchase ($${spendAmount.toFixed(2)})`,
          spend_amount: spendAmount,
          credit_rate: 0.01,
          credit_earned: creditEarned,
          created_at: createdDate.toISOString(),
          expires_at: expiresDate.toISOString(),
          is_redeemed: false
        };

        if (supabase) {
          const { error } = await supabase.from('customer_spends').insert([newSpend]);
          if (error) console.error('Supabase spend insert error:', error);
        }

        const daysRemaining = Math.max(0, Math.round((expiresDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

        return res.status(200).json({
          success: true,
          spend: newSpend,
          credit_earned: creditEarned,
          expires_at: expiresDate.toISOString(),
          days_remaining: daysRemaining,
          qualifies: spendAmount >= 25.00,
          backend: supabase ? 'supabase' : 'mock-active'
        });
      }

      // 4. REDEEM REWARDS CREDIT TOWARDS PURCHASE
      case 'redeem_credit': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { email, amount, order_id, order_description } = req.body || {};

        if (!email || amount === undefined) {
          return res.status(400).json({ error: 'Email and amount are required to redeem credit' });
        }

        const redeemAmount = Math.max(0, parseFloat(amount) || 0.00);
        if (redeemAmount <= 0) {
          return res.status(400).json({ error: 'Redemption amount must be greater than $0.00' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const desc = order_description || (order_id 
          ? `Rewards Credit Redeemed on Order #${order_id}`
          : 'Rewards Credit Redeemed towards Bakery Purchase');

        const redemptionSpend = {
          customer_email: normalizedEmail,
          order_description: desc,
          spend_amount: 0.00,
          credit_rate: 0.00,
          credit_earned: -Math.round(redeemAmount * 100) / 100, // Negative credit debits balance
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_redeemed: false
        };

        let dbResult = null;
        if (supabase) {
          const { data, error } = await supabase
            .from('customer_spends')
            .insert([redemptionSpend])
            .select()
            .single();

          if (error) {
            console.error('Supabase redeem_credit error:', error);
          } else {
            dbResult = data;
          }
        }

        return res.status(200).json({
          success: true,
          message: `Successfully redeemed $${redeemAmount.toFixed(2)} rewards credit towards purchase!`,
          amount_redeemed: redeemAmount,
          spend: redemptionSpend,
          backend: supabase ? 'supabase' : 'mock-active'
        });
      }

      // 5. GET CUSTOMER BALANCE QUICK LOOKUP (Used by Cart Drawer & Online Checkout)
      case 'get_balance': {
        const email = (req.query.email || (req.body && req.body.email) || '').toLowerCase().trim();
        if (!email) {
          return res.status(400).json({ error: 'Email required' });
        }

        let customer = null;
        let activeBalance = 0.00;

        if (supabase) {
          const { data: custData } = await supabase
            .from('customers')
            .select('member_id, name, email')
            .eq('email', email)
            .single();

          if (custData) {
            customer = custData;
            const { data: spends } = await supabase
              .from('customer_spends')
              .select('credit_earned, expires_at, is_redeemed')
              .eq('customer_email', email);

            if (spends) {
              const now = Date.now();
              for (const s of spends) {
                const exp = new Date(s.expires_at).getTime();
                if (exp > now && !s.is_redeemed) {
                  activeBalance += Number(s.credit_earned) || 0;
                }
              }
            }
          }
        }

        return res.status(200).json({
          success: true,
          customer: customer,
          active_balance: Math.max(0, Math.round(activeBalance * 100) / 100),
          backend: supabase ? 'supabase' : 'mock-active'
        });
      }

      // 6. SUPABASE STATUS CHECK
      case 'status': {
        return res.status(200).json({
          status: 'online',
          supabase_configured: !!supabase,
          supabase_url: SUPABASE_URL ? SUPABASE_URL.replace(/https:\/\/(.{4}).*(\.supabase\.co)/, 'https://$1...$2') : null,
          rules: {
            qualifying_threshold: '$25.00',
            credit_percentage: '1.0%',
            credit_expiration_days: 90,
            reminder_threshold_days: 7,
            redemption_allowed: true,
            redemption_terms: 'Customer rewards credit can be redeemed towards the next purchase at online checkout or counter pickup'
          }
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Rewards backend error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

