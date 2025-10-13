import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function NewsSummaryCard({ story, onSelect }) {
  const cardRef = useRef();

  useEffect(() => {
    // Add hover animations
    const card = cardRef.current;
    
    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -6,
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleCardClick = () => {
    // Add click animation
    gsap.to(cardRef.current, {
      scale: 0.98,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
      onComplete: () => {
        if (onSelect) {
          onSelect(story);
        }
      }
    });
  };

  return (
    <article 
      className="news-summary-card" 
      ref={cardRef}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      <div className="news-card-summary">
        {story.summary}
      </div>
      
      <div className="news-card-sources">
        <h4>Available Sources</h4>
        <div className="source-list">
          {story.sources && story.sources.map((source, index) => (
            <a
              key={index}
              href={source.url}
              className={`source-item ${source.bias}`}
              onClick={(e) => {
                e.stopPropagation();
                // Add source click animation
                gsap.to(e.target, {
                  scale: 0.95,
                  duration: 0.1,
                  yoyo: true,
                  repeat: 1,
                  ease: "power2.inOut"
                });
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.name}
            </a>
          ))}
        </div>
      </div>
      
      <div className="card-action">
        <button 
          className="compare-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          Compare Coverage
        </button>
      </div>
    </article>
  );
}
