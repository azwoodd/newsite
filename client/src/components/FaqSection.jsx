import { useState } from 'react';

const FaqItem = ({ question, answer, note, isOpen, toggleFaq, index }) => {
  return (
    <div className="mb-4">
      <button 
        className="w-full text-left flex justify-between items-center bg-white/5 p-5 rounded-lg hover:bg-white/10 transition-colors duration-300"
        onClick={() => toggleFaq(index)}
      >
        <h3 className="text-xl font-semibold text-accent">{question}</h3>
        <span className="text-accent text-xl transform transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
          <i className="fas fa-chevron-down"></i>
        </span>
      </button>
      
      {/* Collapsible content */}
      <div 
        className={`bg-white/5 px-5 overflow-hidden transition-all duration-300 rounded-b-lg ${
          isOpen ? 'max-h-96 py-5 opacity-100 mt-1' : 'max-h-0 py-0 opacity-0'
        }`}
      >
        <p className="text-light-muted">{answer}</p>
        {note && (
          <div className="text-sm text-white/40 italic border-l-2 border-white/10 pl-4 mt-4">
            {note}
          </div>
        )}
      </div>
    </div>
  );
};

const FaqSection = () => {
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);
  
  const toggleFaq = (index) => {
    setActiveFaqIndex(activeFaqIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: "How long does it take to create my custom song?",
      answer: "We usually deliver the first version within 48 hours, though it may take up to 5 days. Revisions are typically completed within 24 hours. CDs and vinyls take longer.",
      note: "Note: vinyls especially have long lead times and can take up to 6 weeks to press, plus shipping, so please order only if you're okay with the wait."
    },
    {
      question: "What happens if I'm not satisfied with my song?",
      answer: "We include revision options with every package to ensure your complete satisfaction. Our creative team will work closely with you to address your feedback and make adjustments until the song perfectly captures your vision and emotions.",
      note: "Our goal is your complete satisfaction - we have a 99% satisfaction rate and are committed to making sure you love your personalised song."
    },
    {
      question: "How do you create your songs?",
      answer: "We use a combination of creative writing, musical composition, and production technologies to create your custom song. Our team carefully analyses your story and preferences to craft lyrics and music that authentically capture your unique experience.",
      note: "Note: Songsculptors utilises a variety of modern techniques and technologies in our creative process to deliver high-quality custom songs efficiently and affordably. Each song is carefully reviewed and refined by our team to ensure it meets our standards of quality and emotional resonance."
    },
    {
      question: "Can I select the music style for my song?",
      answer: "Absolutely! Our questionnaire includes options for your preferred music style, tempo, and mood. You can also include extra notes and reference songs that have the sound you're looking for, and we'll create something in a similar style."
    },
    {
      question: "How will I receive my completed song?",
      answer: "Once your song is ready, you’ll find it in your account dashboard with two version options. You’ll be able to preview both, then choose one to download as your final MP3. After download, the other version will no longer be available, so please decide carefully. If you'd like changes before choosing, just open a ticket through the Help Desk—we're happy to assist!"
    },
    {
      question: "Can I provide my own lyrics?",
      answer: "Yes! You have the option to either let our team write lyrics based on your story, or you can provide your own lyrics. During the order process, you'll have the opportunity to choose which option works best for you."
    },
    {
      question: "Is my song truly unique and personalised?",
      answer: "Absolutely. Every song we create is completely bespoke and crafted specifically for you based on your story, preferences, and the details you share. No two songs are ever the same - your song will be as unique as your story."
    }
  ];

  return (
    <section id="faq" className="relative py-20 bg-deep">
      <div className="absolute top-[-100px] left-0 w-full h-[100px] bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 1440 320%27%3E%3Cpath fill=%27%23070B16%27 fill-opacity=%271%27 d=%27M0,128L48,149.3C96,171,192,213,288,224C384,235,480,213,576,181.3C672,149,768,107,864,106.7C960,107,1056,149,1152,154.7C1248,160,1344,128,1392,112L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z%27%3E%3C/path%3E%3C/svg%3E')] bg-cover"></div>
      
      <div className="container-custom">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block">
            Frequently Asked Questions
            <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
          </h2>
          <p className="max-w-xl mx-auto text-light-muted">
            Answers to common questions about our custom song service.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <FaqItem 
              key={index}
              question={item.question}
              answer={item.answer}
              note={item.note}
              isOpen={activeFaqIndex === index}
              toggleFaq={toggleFaq}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;