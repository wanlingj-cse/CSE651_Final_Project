import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-09-30.endive',
});

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);

    if (webhookSecret) {
      // Best Practice: Always verify event signatures with webhook signing secret
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // Development fallback if webhook secret is not set yet
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET is not configured. Parsing unverified payload for testing.');
      event = JSON.parse(rawBody.toString('utf8'));
    }
  } catch (err) {
    console.error(`⚠️ Webhook error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout events
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object;

      // Best Practice: Fulfill ONLY when payment_status is not 'unpaid'
      if (session.payment_status !== 'unpaid') {
        console.log(`✅ [Fulfillment Triggered] Order for Session ID: ${session.id}`);
        console.log(`   Customer: ${session.customer_details?.name || 'Guest'} (${session.customer_details?.email})`);
        console.log(`   Total Paid: $${(session.amount_total / 100).toFixed(2)}`);
        console.log(`   Pickup Date: ${session.metadata?.pickupDate}`);
        console.log(`   Pickup Time: ${session.metadata?.pickupTime}`);
        console.log(`   Customer Notes: ${session.metadata?.customerNotes}`);

        // In a production backend, insert order into database, notify bakery staff, print ticket
      } else {
        console.log(`⏳ [Delayed Payment] Session ${session.id} completed but payment status is '${session.payment_status}'. Awaiting async payment.`);
      }
      break;
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object;
      console.warn(`❌ [Payment Failed] Session ${session.id} async payment failed.`);
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return res.status(200).json({ received: true });
}
