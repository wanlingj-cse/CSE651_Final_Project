import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-09-30.endive',
});

export default async function handler(req, res) {
  // Set CORS headers for local/cross-origin development
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { items, pickupDate, pickupTime, customerNotes, successUrl, cancelUrl } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your bakery box is empty' });
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'peters-bakery.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = `${proto}://${host}`;

    // Map cart items to Stripe line items
    const line_items = items.map((item) => {
      const unitAmount = Math.round(Number(item.price) * 100);
      const description = item.details ? String(item.details).substring(0, 500) : undefined;
      const imageUrl = item.img
        ? (item.img.startsWith('http') ? item.img : `${origin}/${item.img.replace(/^\//, '')}`)
        : undefined;

      return {
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          tax_behavior: 'exclusive',
          product_data: {
            name: item.name || 'Bakery Item',
            description: description,
            images: imageUrl ? [imageUrl] : [],
            // Product tax code for Bakery goods & prepared food
            tax_code: 'txcd_40010000',
            metadata: {
              details: description || '',
            },
          },
        },
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
      };
    });

    const isDigitalOnly = items.every(
      (i) => i.isDigital || (i.name && i.name.toLowerCase().includes('gift card'))
    );

    const rewardCreditRedeemedNum = parseFloat(req.body.rewardCreditRedeemed) || 0;
    const customerEmail = (req.body.customerEmail || '').trim();

    // Create Checkout Session following Stripe Best Practices
    const sessionConfig = {
      mode: 'payment',
      line_items,
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        pickupDate: pickupDate || 'Earliest available (48h lead time)',
        pickupTime: pickupTime || 'Morning (9:00 AM - 12:00 PM)',
        customerNotes: (customerNotes || '').substring(0, 500),
        storeLocation: '3108 Alum Rock Ave, San Jose, CA 95127',
      },
      success_url: successUrl
        ? (successUrl.startsWith('http') ? successUrl : `${origin}${successUrl.startsWith('/') ? '' : '/'}${successUrl}`)
        : `${origin}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl
        ? (cancelUrl.startsWith('http') ? cancelUrl : `${origin}${cancelUrl.startsWith('/') ? '' : '/'}${cancelUrl}`)
        : `${origin}/orders.html#cart`,
    };

    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
      sessionConfig.metadata.customerEmail = customerEmail;
    }

    // Apply Peters' Bakery Rewards Credit redemption as a Stripe discount
    if (rewardCreditRedeemedNum > 0) {
      const subtotalCents = line_items.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
      const discountCents = Math.min(Math.round(rewardCreditRedeemedNum * 100), subtotalCents);
      if (discountCents > 0) {
        try {
          const coupon = await stripe.coupons.create({
            amount_off: discountCents,
            currency: 'usd',
            duration: 'once',
            name: `Peters' Bakery Rewards Credit (-$${(discountCents / 100).toFixed(2)})`,
          });
          sessionConfig.discounts = [{ coupon: coupon.id }];
          sessionConfig.metadata.rewardCreditRedeemed = (discountCents / 100).toFixed(2);
        } catch (couponErr) {
          console.warn('Could not create Stripe coupon, continuing without coupon:', couponErr);
        }
      }
    }

    if (!isDigitalOnly) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US'],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);


    return res.status(200).json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating Stripe Checkout Session:', error);
    return res.status(500).json({ error: error.message });
  }
}
