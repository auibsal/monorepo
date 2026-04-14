'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'general',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate sending a secure message to the Federation backend
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', department: 'general', message: '' });
      
      // Reset the success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 1500);
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col">
      
      {/* HEADER SECTION */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden border-b border-federation-ivory/10">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
        <div className="text-center max-w-4xl mx-auto z-10 relative">
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80 text-federation-ivory" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>

          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            Contact <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              Headquarters
            </span>
          </h1>
          <p className="text-lg font-light opacity-70 max-w-2xl mx-auto leading-relaxed">
            The Iraqi Dominoes Association operates out of Baghdad. For official inquiries, partnership requests, or dispute resolutions, please direct your communication to the appropriate department.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT GRID */}
      <section className="flex-grow max-w-7xl mx-auto w-full px-6 lg:px-12 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* LEFT COLUMN: DIRECTORY */}
        <div className="space-y-12">
          
          {/* Physical Address */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Primary Seat</h3>
            <h2 className="text-2xl font-bold uppercase tracking-wide text-federation-ivory mb-4">IDA Baghdad Office</h2>
            <div className="font-light opacity-80 leading-relaxed border-l-2 border-federation-ivory/20 pl-4 space-y-1">
              <p>Al-Karrada District</p>
              <p>Baghdad, Republic of Iraq</p>
              <p className="pt-2 text-sm opacity-70 font-mono">Coordinates: 33.2940° N, 44.4258° E</p>
            </div>
          </div>

          {/* Department Emails */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-6">Official Directory</h3>
            
            <div className="space-y-6">
              <div className="bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10 hover:bg-federation-ivory/10 transition-colors">
                <h4 className="text-lg font-bold uppercase mb-1">General Operations</h4>
                <p className="font-light opacity-70 text-sm mb-3">For player registration issues, platform bugs, and general inquiries.</p>
                <a href="mailto:info@ida.iq" className="font-mono text-federation-ivory tracking-wider hover:underline">info@ida.iq</a>
              </div>

              <div className="bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10 hover:bg-federation-ivory/10 transition-colors">
                <h4 className="text-lg font-bold uppercase mb-1">Commercial & Partnerships</h4>
                <p className="font-light opacity-70 text-sm mb-3">For corporate sponsorships, venue affiliation, and media rights.</p>
                <a href="mailto:commercial@ida.iq" className="font-mono text-federation-ivory tracking-wider hover:underline">commercial@ida.iq</a>
              </div>

              <div className="bg-federation-ivory/5 p-6 rounded-sm border border-red-900/30 hover:border-red-500/50 transition-colors">
                <h4 className="text-lg font-bold uppercase mb-1">Arbitration & Ethics</h4>
                <p className="font-light opacity-70 text-sm mb-3">For match disputes, rulebook clarifications, and reporting violations.</p>
                <a href="mailto:arbitration@ida.iq" className="font-mono text-red-400 tracking-wider hover:underline">arbitration@ida.iq</a>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SECURE FORM */}
        <div className="bg-federation-ivory/5 border border-federation-ivory/20 p-8 md:p-10 rounded-sm shadow-2xl h-fit">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-2">Secure Dispatch</h3>
          <p className="font-light opacity-70 text-sm mb-8">
            Submit a formal inquiry directly to the Federation's internal routing system. All correspondence is securely logged.
          </p>

          {isSubmitted ? (
            <div className="bg-green-950/50 border border-green-500/50 p-8 text-center rounded-sm animate-pulse">
              <h4 className="text-xl font-bold text-green-400 uppercase tracking-widest mb-2">Transmission Successful</h4>
              <p className="font-light opacity-80 text-sm">Your message has been securely routed to the selected department. An official will respond to your email shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                  Full Name / Federation ID
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                  placeholder="e.g. Ahmed Al-Fadhli (IDA-001042)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                  Reply Email Address
                </label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                  Routing Department
                </label>
                <select 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors appearance-none cursor-pointer"
                >
                  <option value="general">General Operations</option>
                  <option value="commercial">Commercial & Venues</option>
                  <option value="arbitration">Arbitration & Dispute Resolution</option>
                  <option value="press">Press & Media Relations</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-federation-ivory/70">
                  Official Message
                </label>
                <textarea 
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-black/50 border border-federation-ivory/20 rounded-sm px-4 py-3 text-federation-ivory focus:outline-none focus:border-federation-ivory transition-colors resize-none"
                  placeholder="Detail your inquiry here..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 mt-2 font-bold uppercase tracking-widest rounded-sm transition-all duration-200 flex justify-center items-center gap-3 ${isLoading ? 'bg-federation-ivory/50 text-federation-obsidian cursor-not-allowed' : 'bg-federation-ivory text-federation-obsidian hover:bg-white'}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-federation-obsidian/30 border-t-federation-obsidian rounded-full animate-spin"></div>
                    Transmitting...
                  </>
                ) : (
                  'Dispatch Message'
                )}
              </button>

            </form>
          )}
        </div>
      </section>
    </div>
  );
}
