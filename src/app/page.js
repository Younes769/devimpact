"use client";

import { useState, useEffect } from 'react';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Stats from '@/components/Stats';
import Schedule from '@/components/Schedule';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import RegistrationModal from '@/components/RegistrationModal';
import ParticlesBackground from '@/components/ParticlesBackground';
import Countdown from '@/components/Countdown';
import Sponsors from '@/components/Sponsors';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if environment variables are loaded
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Interactive background */}
      <ParticlesBackground />
      
      {/* Countdown timer - hide on very small screens */}
      <div className="hidden sm:block">
        <Countdown />
      </div>

      {/* Main content */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Add responsive padding */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Hero onRegisterClick={() => setIsModalOpen(true)} />
          <Stats />
          <About />
          <Schedule />
          <Sponsors />
          <FAQ />
          <Footer />
        </div>
      </div>

      {/* Registration modal */}
      <RegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
