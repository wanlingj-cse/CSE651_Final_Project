import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-09-30.endive',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing session_id parameter' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.taxes', 'customer_details'],
    });

    return res.status(200).json({
      id: session.id,
      payment_status: session.payment_status,
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      total_details: session.total_details,
      customer_details: session.customer_details,
      metadata: session.metadata,
      line_items: session.line_items?.data || [],
      created: session.created,
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return res.status(500).json({ error: error.message });
  }
}
