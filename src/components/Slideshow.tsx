import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Swiper as SwiperClass } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard } from 'swiper/modules';
import Image from 'next/image';
import { FaArrowLeft, FaArrowRight, FaTimes } from 'react-icons/fa';

// Dynamically import YouTube to avoid SSR issues
const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

interface SlideshowProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
}

const Slideshow: React.FC<SlideshowProps> = ({ images, isOpen, onClose }) => {
  const [player, setPlayer] = useState<any>(null);
  const swiperRef = useRef<SwiperClass | null>(null);

  // Set up keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && swiperRef.current) {
        swiperRef.current.slidePrev();
      } else if (e.key === 'ArrowRight' && swiperRef.current) {
        swiperRef.current.slideNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // YouTube player options
  const opts = {
    height: '200', // Give it some height to ensure proper loading
    width: '200',
    playerVars: {
      autoplay: 1,
      mute: 0, // Ensure not muted
      loop: 1,
      playlist: 'bBTeAg5CFRA', // User specified YouTube video
      controls: 0,
      origin: window.location.origin, // Important for security and proper functioning
    },
  };

  // Handle YouTube player ready
  const onReady = (event: any) => {
    if (event && event.target) {
      setPlayer(event.target);
      // Only try to play if the method exists
      if (typeof event.target.playVideo === 'function') {
        event.target.playVideo();
      }
    }
  };

  // Control YouTube player state based on slideshow visibility
  useEffect(() => {
    // Using a safe function to call methods on the player to avoid errors
    const safePlayerCall = (methodName: string) => {
      try {
        if (player && typeof player[methodName] === 'function') {
          player[methodName]();
        }
      } catch (err) {
        console.log(`Error calling ${methodName}:`, err);
        // Silently fail on player method errors
      }
    };
    
    // Wait a short moment to ensure player is ready
    const timer = setTimeout(() => {
      if (isOpen) {
        safePlayerCall('playVideo');
      } else if (player) { // Only try to pause if we have a player reference
        safePlayerCall('pauseVideo');
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isOpen, player]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black z-50 flex items-center justify-center'>
      <div className='absolute top-4 right-4 z-10'>
        <button 
          onClick={onClose}
          className='text-white p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors'
        >
          <FaTimes size={24} />
        </button>
      </div>
      
      {/* Slideshow */}
      <Swiper
        modules={[Navigation, Keyboard]}
        navigation={{
          prevEl: '.swiper-button-prev',
          nextEl: '.swiper-button-next',
        }}
        keyboard={{ enabled: true }}
        slidesPerView={1}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        className='w-full h-screen'
      >
        {images.map((src, index) => (
          <SwiperSlide key={index} className='flex items-center justify-center'>
            <div className='animate-fadeIn'>
              <div className='relative h-screen w-full'>
                <Image 
                  src={src} 
                  alt={`Slide ${index + 1}`}
                  className='max-h-screen w-auto object-contain'
                  fill
                  unoptimized
                  priority
                />
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom navigation buttons */}
      <div className='swiper-button-prev absolute left-4 top-1/2 transform -translate-y-1/2 z-10'>
        <button className='text-white p-3 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors'>
          <FaArrowLeft size={24} />
        </button>
      </div>
      <div className='swiper-button-next absolute right-4 top-1/2 transform -translate-y-1/2 z-10'>
        <button className='text-white p-3 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors'>
          <FaArrowRight size={24} />
        </button>
      </div>
      
      {/* YouTube player (minimally visible for audio playback) */}
      <div className='absolute bottom-0 right-0 opacity-20 pointer-events-none' style={{ width: '200px', height: '200px', zIndex: 1 }}>
        <YouTube videoId='bBTeAg5CFRA' opts={opts} onReady={onReady} />
      </div>
    </div>
  );
};

export default Slideshow;
