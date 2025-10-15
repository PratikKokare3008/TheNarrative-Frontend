import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { gsap } from 'gsap';
import moment from 'moment';

const SportsSchedule = ({ sport = 'all', compact = false }) => {
  const [selectedSport, setSelectedSport] = useState(sport);
  const [viewMode, setViewMode] = useState('today'); // today, week, upcoming
  const [animationEnabled] = useState(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  const scheduleRef = useRef(null);
  const listRef = useRef(null);

  // Sports API configuration
  const API_KEY = process.env.REACT_APP_SPORTS_API_KEY || 'demo';
  const API_BASE = process.env.REACT_APP_SPORTS_API_BASE || 'https://api.sportsdata.io/v3';

  // Available sports
  const availableSports = [
    { id: 'all', name: 'All Sports', icon: '🏆' },
    { id: 'nfl', name: 'NFL', icon: '🏈' },
    { id: 'nba', name: 'NBA', icon: '🏀' },
    { id: 'mlb', name: 'MLB', icon: '⚾' },
    { id: 'nhl', name: 'NHL', icon: '🏒' },
    { id: 'soccer', name: 'Soccer', icon: '⚽' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' }
  ];

  // Fetch sports schedule
  const { 
    data: scheduleData, 
    isLoading: scheduleLoading, 
    error: scheduleError,
    refetch: refetchSchedule 
  } = useQuery(
    ['sports-schedule', selectedSport, viewMode],
    async () => {
      if (API_KEY === 'demo') {
        // Return demo data
        return generateDemoData();
      }

      const endpoint = getAPIEndpoint(selectedSport, viewMode);
      const response = await axios.get(endpoint, {
        headers: {
          'Ocp-Apim-Subscription-Key': API_KEY
        },
        timeout: 5000
      });
      
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      onError: (error) => {
        console.error('Sports schedule fetch error:', error);
      }
    }
  );

  // Generate demo data
  const generateDemoData = () => {
    const demoGames = [
      {
        id: '1',
        homeTeam: 'Lakers',
        awayTeam: 'Warriors',
        homeScore: 108,
        awayScore: 112,
        status: 'Final',
        date: moment().subtract(1, 'hour'),
        sport: 'NBA',
        icon: '🏀'
      },
      {
        id: '2',
        homeTeam: 'Chiefs',
        awayTeam: 'Patriots',
        homeScore: null,
        awayScore: null,
        status: 'Scheduled',
        date: moment().add(2, 'hours'),
        sport: 'NFL',
        icon: '🏈'
      },
      {
        id: '3',
        homeTeam: 'Yankees',
        awayTeam: 'Red Sox',
        homeScore: 7,
        awayScore: 4,
        status: 'Final',
        date: moment().subtract(3, 'hours'),
        sport: 'MLB',
        icon: '⚾'
      },
      {
        id: '4',
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeScore: null,
        awayScore: null,
        status: 'Scheduled',
        date: moment().add(1, 'day'),
        sport: 'Soccer',
        icon: '⚽'
      }
    ];

    return selectedSport === 'all' ? demoGames : demoGames.filter(game => 
      game.sport.toLowerCase() === selectedSport
    );
  };

  // Get API endpoint based on sport and view mode
  const getAPIEndpoint = (sport, mode) => {
    const today = moment().format('YYYY-MM-DD');
    
    switch (sport) {
      case 'nfl':
        return `${API_BASE}/nfl/scores/json/ScoresByDate/${today}`;
      case 'nba':
        return `${API_BASE}/nba/scores/json/GamesByDate/${today}`;
      case 'mlb':
        return `${API_BASE}/mlb/scores/json/GamesByDate/${today}`;
      default:
        return `${API_BASE}/scores/json/GamesByDate/${today}`;
    }
  };

  // Animation effects
  useEffect(() => {
    if (!scheduleRef.current || !animationEnabled) return;

    gsap.fromTo(scheduleRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
    );
  }, [animationEnabled]);

  useEffect(() => {
    if (!listRef.current || !animationEnabled || !scheduleData) return;

    gsap.fromTo('.game-card',
      { x: -20, opacity: 0 },
      { 
        x: 0, 
        opacity: 1, 
        duration: 0.4, 
        stagger: 0.1, 
        ease: "power1.out" 
      }
    );
  }, [scheduleData, animationEnabled]);

  // Event handlers
  const handleSportChange = useCallback((sportId) => {
    setSelectedSport(sportId);
    
    if (window.gtag) {
      window.gtag('event', 'sport_filter_change', {
        event_category: 'Sports Schedule',
        sport: sportId
      });
    }
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    
    if (window.gtag) {
      window.gtag('event', 'sports_view_change', {
        event_category: 'Sports Schedule',
        view_mode: mode
      });
    }
  }, []);

  // Format game status
  const getGameStatus = (game) => {
    if (game.status === 'Final') {
      return { text: 'Final', color: '#059669' };
    } else if (game.status === 'InProgress' || game.status === 'Live') {
      return { text: 'Live', color: '#dc2626' };
    } else if (game.status === 'Scheduled') {
      return { 
        text: moment(game.date).format('h:mm A'), 
        color: '#64748b' 
      };
    } else {
      return { text: game.status, color: '#64748b' };
    }
  };

  // Get sport icon
  const getSportIcon = (sport) => {
    const sportData = availableSports.find(s => s.name.toLowerCase() === sport.toLowerCase());
    return sportData?.icon || '🏆';
  };

  // Loading state
  if (scheduleLoading) {
    return (
      <div ref={scheduleRef} className="sports-schedule loading">
        <div className="sports-loading">
          <div className="loading-icon">🏆</div>
          <p>Loading sports schedule...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (scheduleError) {
    return (
      <div ref={scheduleRef} className="sports-schedule error">
        <div className="sports-error">
          <div className="error-icon">⚠️</div>
          <h3>Sports Schedule Unavailable</h3>
          <p>{scheduleError?.message || 'Failed to load sports data'}</p>
          <button onClick={refetchSchedule} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Compact view
  if (compact) {
    const recentGames = scheduleData?.slice(0, 3) || [];
    
    return (
      <div ref={scheduleRef} className="sports-schedule compact">
        <div className="sports-header">
          <h4>🏆 Sports</h4>
          {API_KEY === 'demo' && <span className="demo-badge">Demo</span>}
        </div>
        <div className="games-compact">
          {recentGames.map(game => {
            const status = getGameStatus(game);
            return (
              <div key={game.id} className="game-compact">
                <span className="game-teams">
                  {game.awayTeam} @ {game.homeTeam}
                </span>
                <span className="game-score">
                  {game.homeScore !== null ? `${game.awayScore}-${game.homeScore}` : status.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full sports schedule
  return (
    <div ref={scheduleRef} className="sports-schedule">
      <div className="sports-header">
        <div className="header-title">
          <h2>🏆 Sports Schedule</h2>
          {API_KEY === 'demo' && <span className="demo-badge">Demo Data</span>}
        </div>

        <div className="sports-controls">
          {/* Sport Filter */}
          <div className="sport-filter">
            <label htmlFor="sport-select">Sport:</label>
            <select 
              id="sport-select"
              value={selectedSport} 
              onChange={(e) => handleSportChange(e.target.value)}
              className="sport-select"
            >
              {availableSports.map(sport => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            {['today', 'week', 'upcoming'].map(mode => (
              <button
                key={mode}
                className={`view-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => handleViewModeChange(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={listRef} className="games-list">
        {scheduleData && scheduleData.length > 0 ? (
          scheduleData.map(game => {
            const status = getGameStatus(game);
            
            return (
              <div key={game.id} className="game-card">
                <div className="game-header">
                  <span className="sport-icon">
                    {getSportIcon(game.sport)}
                  </span>
                  <span className="game-sport">{game.sport}</span>
                  <span 
                    className="game-status"
                    style={{ color: status.color }}
                  >
                    {status.text}
                  </span>
                </div>

                <div className="game-matchup">
                  <div className="team away-team">
                    <span className="team-name">{game.awayTeam}</span>
                    {game.awayScore !== null && (
                      <span className="team-score">{game.awayScore}</span>
                    )}
                  </div>
                  
                  <div className="matchup-divider">@</div>
                  
                  <div className="team home-team">
                    <span className="team-name">{game.homeTeam}</span>
                    {game.homeScore !== null && (
                      <span className="team-score">{game.homeScore}</span>
                    )}
                  </div>
                </div>

                <div className="game-details">
                  <span className="game-time">
                    📅 {moment(game.date).format('MMM D, h:mm A')}
                  </span>
                  {game.venue && (
                    <span className="game-venue">
                      📍 {game.venue}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-games">
            <div className="no-games-icon">🏆</div>
            <h3>No games scheduled</h3>
            <p>Check back later for upcoming games</p>
          </div>
        )}
      </div>

      <div className="sports-footer">
        <div className="last-updated">
          Updated: {moment().format('HH:mm')}
        </div>
        <button 
          onClick={refetchSchedule} 
          className="refresh-btn"
          disabled={scheduleLoading}
          title="Refresh sports data"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

SportsSchedule.displayName = 'SportsSchedule';

export default SportsSchedule;
