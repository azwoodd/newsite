// client/src/components/AffiliateProgramInfo.jsx
/**
 * Affiliate Program Information Component
 * Displays comprehensive information about the affiliate program
 * Used on both the signup page and in the affiliate dashboard
 * Dark theme with gold accents matching SongSculptors brand
 */
const AffiliateProgramInfo = ({ isCompact = false }) => {
  if (isCompact) {
    // Compact version for dashboard
    return (
      <div className="bg-[#C4A064]/10 border border-[#C4A064]/30 rounded-lg p-5">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center">
          <i className="fas fa-info-circle text-[#C4A064] mr-2"></i>
          How the Affiliate Program Works
        </h3>
        <div className="space-y-2 text-sm text-white/80">
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-0.5"></i>
            <p><strong>Share your link:</strong> Get a unique referral link to share with your audience</p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-0.5"></i>
            <p><strong>Earn commission:</strong> Get 10% on every completed sale from your referrals</p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-0.5"></i>
            <p><strong>Track earnings:</strong> Watch your balance grow in real-time</p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-0.5"></i>
            <p><strong>Request payout:</strong> Withdraw once you reach £10 minimum</p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-0.5"></i>
            <p><strong>Get paid fast:</strong> Receive funds in 3-5 business days via Stripe</p>
          </div>
        </div>
      </div>
    );
  }

  // Full version for signup page
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-secondary">
          Join the <span className="text-[#C4A064]">SongSculptors</span> Affiliate Program
        </h2>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Turn your passion for music into profit. Earn generous commissions by sharing the gift of custom songs with your audience.
        </p>
      </div>

      {/* Key Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] border border-[#C4A064]/30 rounded-lg p-6 text-center">
          <div className="bg-[#C4A064]/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-percentage text-[#C4A064] text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">10% Commission</h3>
          <p className="text-white/70">
            Earn 10% on every completed sale. No limits on how much you can earn.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#C4A064]/30 rounded-lg p-6 text-center">
          <div className="bg-[#C4A064]/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-clock text-[#C4A064] text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Fast Payouts</h3>
          <p className="text-white/70">
            Request payout anytime. Receive funds within 3-5 business days via Stripe.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#C4A064]/30 rounded-lg p-6 text-center">
          <div className="bg-[#C4A064]/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-chart-line text-[#C4A064] text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Real-Time Tracking</h3>
          <p className="text-white/70">
            Monitor clicks, conversions, and earnings with our detailed dashboard.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          How It Works
        </h3>
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="bg-[#C4A064] text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Apply & Get Approved</h4>
              <p className="text-white/70">
                Fill out our simple application form. Tell us about your platform and how you plan to promote SongSculptors. We review applications within 48 hours.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-[#C4A064] text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Get Your Unique Link</h4>
              <p className="text-white/70">
                Once approved, receive your personalized affiliate link and promo code. Share it on your blog, social media, YouTube, podcast, or anywhere your audience is.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-[#C4A064] text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Earn Commissions</h4>
              <p className="text-white/70">
                When someone clicks your link and makes a purchase, you earn 10% commission. Commissions are approved as soon as the payment clears and added to your balance instantly.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-[#C4A064] text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
              4
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Request Payout</h4>
              <p className="text-white/70">
                Once you reach £10, request a payout directly from your dashboard. Choose Stripe for fast 3-5 day processing, or bank transfer for 5-7 days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Structure */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          Commission Structure
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr className="text-left text-white/80">
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Price Range</th>
                <th className="px-4 py-3">Your Commission (10%)</th>
              </tr>
            </thead>
            <tbody className="text-white">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 font-semibold">Essential</td>
                <td className="px-4 py-3">£149 - £199</td>
                <td className="px-4 py-3 text-[#C4A064] font-bold">£14.90 - £19.90</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 font-semibold">Signature</td>
                <td className="px-4 py-3">£299 - £399</td>
                <td className="px-4 py-3 text-[#C4A064] font-bold">£29.90 - £39.90</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 font-semibold">Masterpiece</td>
                <td className="px-4 py-3">£499+</td>
                <td className="px-4 py-3 text-[#C4A064] font-bold">£49.90+</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">With Add-ons</td>
                <td className="px-4 py-3">Up to £700+</td>
                <td className="px-4 py-3 text-[#C4A064] font-bold">Up to £70+</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-white/60 text-sm mt-4 text-center">
          Commission is calculated on the total order value after discounts
        </p>
      </div>

      {/* Payout Terms */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          Payout Terms & Conditions
        </h3>
        <div className="space-y-4 text-white/80">
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-1"></i>
            <p>
              <strong className="text-white">Minimum Threshold:</strong> £10.00 GBP. You can request a payout once your balance reaches this amount.
            </p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-1"></i>
            <p>
              <strong className="text-white">Holding Period:</strong> Commissions must be at least 14 days old to be eligible for payout. This protects against chargebacks and refunds.
            </p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-1"></i>
            <p>
              <strong className="text-white">Payment Methods:</strong> Stripe (3-5 business days) or Bank Transfer (5-7 business days). All payments in GBP.
            </p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-1"></i>
            <p>
              <strong className="text-white">Tax Responsibility:</strong> Affiliates are responsible for reporting and paying taxes on earnings in their jurisdiction.
            </p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-1"></i>
            <p>
              <strong className="text-white">Security Checks:</strong> All payouts are subject to fraud prevention checks. We verify payment details before processing.
            </p>
          </div>
          <div className="flex items-start">
            <i className="fas fa-check-circle text-[#C4A064] mr-3 mt-1"></i>
            <p>
              <strong className="text-white">Self-Referrals:</strong> You cannot earn commission on your own purchases. Our system automatically detects and blocks self-referrals.
            </p>
          </div>
        </div>
      </div>

      {/* Ideal Affiliates */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          Who Should Apply?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-[#C4A064] mb-3">Perfect For:</h4>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start">
                <i className="fas fa-star text-[#C4A064] mr-3 mt-1"></i>
                <span>Music bloggers and influencers</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-star text-[#C4A064] mr-3 mt-1"></i>
                <span>YouTubers and content creators</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-star text-[#C4A064] mr-3 mt-1"></i>
                <span>Wedding and event planners</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-star text-[#C4A064] mr-3 mt-1"></i>
                <span>Gift recommendation sites</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-star text-[#C4A064] mr-3 mt-1"></i>
                <span>Lifestyle and relationship bloggers</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-[#C4A064] mb-3">What We Look For:</h4>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start">
                <i className="fas fa-check text-[#C4A064] mr-3 mt-1"></i>
                <span>Active audience interested in gifts/music</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-[#C4A064] mr-3 mt-1"></i>
                <span>Quality content that aligns with our brand</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-[#C4A064] mr-3 mt-1"></i>
                <span>Genuine passion for what we create</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-[#C4A064] mr-3 mt-1"></i>
                <span>Professional approach to promotion</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-[#C4A064] mr-3 mt-1"></i>
                <span>Commitment to ethical marketing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              How long does approval take?
            </h4>
            <p className="text-white/70">
              We review all applications within 48 hours. You'll receive an email notification once your application is approved or if we need additional information.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              Can I promote on social media?
            </h4>
            <p className="text-white/70">
              Absolutely! Social media is one of the best ways to share your affiliate link. Instagram, TikTok, YouTube, Facebook - wherever your audience is, share away!
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              What if someone uses my link but doesn't buy immediately?
            </h4>
            <p className="text-white/70">
              Our tracking cookie lasts 30 days. If someone clicks your link and purchases within 30 days, you still earn the commission!
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              Is there a limit to how much I can earn?
            </h4>
            <p className="text-white/70">
              No limits! The more you promote, the more you earn. Some of our top affiliates earn over £1,000 per month.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              Do you provide marketing materials?
            </h4>
            <p className="text-white/70">
              Yes! Once approved, you'll get access to banners, sample posts, email templates, and promotional content to make sharing easier.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#C4A064]/20 to-[#D4B074]/20 border border-[#C4A064]/30 rounded-lg p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">
          Ready to Start Earning?
        </h3>
        <p className="text-white/80 mb-6 max-w-2xl mx-auto">
          Join hundreds of affiliates who are already earning commissions by sharing the magic of custom songs. Apply now and start your journey!
        </p>
        <a
          href="#application-form"
          className="inline-block bg-gradient-to-r from-[#C4A064] to-[#D4B074] text-black font-bold px-8 py-4 rounded-lg hover:shadow-lg hover:shadow-[#C4A064]/30 transition-all"
        >
          <i className="fas fa-rocket mr-2"></i>
          Apply Now
        </a>
      </div>
    </div>
  );
};

export default AffiliateProgramInfo;