import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import moment from 'moment';

const API_URL = process.env.REACT_APP_API_URL || 'https://thenarrative-backend.onrender.com';

const SportsSchedule = ({ 
    compact = true, 
    sports = ['nfl', 'nba', 'mlb', 'soccer'],
    className = '' 
}) => {
    const [selectedSport, setSelectedSport] = useState(sports[0]);
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const [isExpanded, setIsExpanded] = useState(false);

    // Sports data query
    const {
        data: sportsData,
        isLoading,
        error,
        refetch
    } = useQuery(
        ['sports-schedule', selectedSport, selectedDate],
        async () => {
            const response = await axios.get(`${API_URL}/api/sports`, {
                params: {
                    sport: selectedSport,
                    date: selectedDate,
                    compact: compact && !isExpanded
                },
                timeout: 10000
            });

            return response.data;
        },
        {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 15 * 60 * 1000, // 15 minutes
            refetchOnWindowFocus: true,
            retry: 2
        }
    );

    const getSportIcon = useCallback((sport) => {
        const iconMap = {
            'nfl': '🏈',
            'nba': '🏀',
            'mlb': '⚾',
            'nhl': '🏒',
            'soccer': '⚽',
            'tennis': '🎾',
            'golf': '⛳',
            'cricket': '🏏'
        };
        return iconMap[sport.toLowerCase()] || '🏆';
    }, []);

    const getSportName = useCallback((sport) => {
        const nameMap = {
            'nfl': 'NFL',
            'nba': 'NBA',
            'mlb': 'MLB',
            'nhl': 'NHL',
            'soccer': 'Soccer',
            'tennis': 'Tennis',
            'golf': 'Golf',
            'cricket': 'Cricket'
        };
        return nameMap[sport.toLowerCase()] || sport.toUpperCase();
    }, []);

    const getGameStatus = useCallback((game) => {
        const now = moment();
        const gameTime = moment(game.startTime);
        
        if (game.status === 'completed' || game.finished) {
            return { status: 'Final', color: '#6b7280', icon: '✅' };
        }
        
        if (game.status === 'live' || game.inProgress) {
            return { status: 'Live', color: '#dc2626', icon: '🔴' };
        }
        
        if (gameTime.isBefore(now.add(2, 'hours'))) {
            return { status: 'Starting Soon', color: '#d97706', icon: '⏰' };
        }
        
        return { 
            status: gameTime.format('h:mm A'), 
            color: '#059669', 
            icon: '📅' 
        };
    }, []);

    const formatScore = useCallback((game) => {
        if (game.homeScore !== undefined && game.awayScore !== undefined) {
            return `${game.awayScore} - ${game.homeScore}`;
        }
        return null;
    }, []);

    const upcomingGames = useMemo(() => {
        if (!sportsData?.games) return [];
        return sportsData.games.filter(game => 
            !game.finished && !game.status?.includes('completed')
        );
    }, [sportsData]);

    const recentGames = useMemo(() => {
        if (!sportsData?.games) return [];
        return sportsData.games.filter(game => 
            game.finished || game.status?.includes('completed')
        );
    }, [sportsData]);

    const handleToggleExpanded = useCallback(() => {
        setIsExpanded(!isExpanded);
    }, [isExpanded]);

    const handleSportChange = useCallback((sport) => {
        setSelectedSport(sport);
    }, []);

    const handleDateChange = useCallback((date) => {
        setSelectedDate(date);
    }, []);

    if (isLoading && !sportsData) {
        return (
            <div className={`sports-widget loading ${className}`}>
                <div className="sports-loading">
                    <span className="loading-icon">🏆</span>
                    <span className="loading-text">Loading sports...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`sports-widget error ${className}`}>
                <div className="sports-error">
                    <span className="error-icon">❌</span>
                    <button 
                        onClick={refetch}
                        className="retry-button"
                        title="Retry sports data fetch"
                    >
                        🔄 Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!sportsData?.games || sportsData.games.length === 0) {
        return (
            <div className={`sports-widget no-data ${className}`}>
                <div className="no-games-message">
                    <span className="no-games-icon">{getSportIcon(selectedSport)}</span>
                    <span className="no-games-text">No games today</span>
                </div>
            </div>
        );
    }

    const nextGame = upcomingGames[0];
    const lastGame = recentGames[0];
    const displayGame = nextGame || lastGame || sportsData.games[0];

    if (compact && !isExpanded) {
        return (
            <div 
                className={`sports-widget compact ${className}`}
                onClick={handleToggleExpanded}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleExpanded();
                    }
                }}
                aria-label="Sports widget - click to expand"
            >
                <div className="sports-compact">
                    <span className="sports-icon">
                        {getSportIcon(selectedSport)}
                    </span>
                    <div className="game-info">
                        <div className="teams">
                            {displayGame.awayTeam?.abbreviation || displayGame.awayTeam?.name} @ {displayGame.homeTeam?.abbreviation || displayGame.homeTeam?.name}
                        </div>
                        <div className="game-time">
                            {getGameStatus(displayGame).status}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`sports-widget expanded ${className}`}>
            {/* Header */}
            <div className="sports-header">
                <div className="sports-title">
                    <span className="title-icon">🏆</span>
                    <span className="title-text">Sports</span>
                </div>
                
                {compact && (
                    <button
                        className="collapse-btn"
                        onClick={handleToggleExpanded}
                        aria-label="Collapse sports widget"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Sport Selector */}
            {sports.length > 1 && (
                <div className="sport-selector">
                    {sports.map(sport => (
                        <button
                            key={sport}
                            className={`sport-tab ${selectedSport === sport ? 'active' : ''}`}
                            onClick={() => handleSportChange(sport)}
                        >
                            <span className="tab-icon">{getSportIcon(sport)}</span>
                            <span className="tab-name">{getSportName(sport)}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Date Selector */}
            <div className="date-selector">
                <div className="date-tabs">
                    {[-1, 0, 1].map(dayOffset => {
                        const date = moment().add(dayOffset, 'day');
                        const dateStr = date.format('YYYY-MM-DD');
                        const isToday = dayOffset === 0;
                        
                        return (
                            <button
                                key={dayOffset}
                                className={`date-tab ${selectedDate === dateStr ? 'active' : ''}`}
                                onClick={() => handleDateChange(dateStr)}
                            >
                                <div className="date-label">
                                    {isToday ? 'Today' : dayOffset === -1 ? 'Yesterday' : 'Tomorrow'}
                                </div>
                                <div className="date-value">
                                    {date.format('MMM D')}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Games List */}
            <div className="games-container">
                {/* Upcoming Games */}
                {upcomingGames.length > 0 && (
                    <div className="games-section">
                        <h4 className="section-title">Upcoming</h4>
                        <div className="games-list">
                            {upcomingGames.slice(0, 5).map((game, index) => {
                                const gameStatus = getGameStatus(game);
                                
                                return (
                                    <div key={game.id || index} className="game-item upcoming">
                                        <div className="game-teams">
                                            <div className="team away">
                                                <div className="team-info">
                                                    <span className="team-name">
                                                        {game.awayTeam?.name || 'Away'}
                                                    </span>
                                                    <span className="team-record">
                                                        {game.awayTeam?.record}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="game-center">
                                                <div className="game-time">
                                                    <span className="status-icon">{gameStatus.icon}</span>
                                                    <span 
                                                        className="status-text"
                                                        style={{ color: gameStatus.color }}
                                                    >
                                                        {gameStatus.status}
                                                    </span>
                                                </div>
                                                {game.venue && (
                                                    <div className="game-venue">
                                                        📍 {game.venue}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="team home">
                                                <div className="team-info">
                                                    <span className="team-name">
                                                        {game.homeTeam?.name || 'Home'}
                                                    </span>
                                                    <span className="team-record">
                                                        {game.homeTeam?.record}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {game.broadcast && (
                                            <div className="game-broadcast">
                                                📺 {game.broadcast}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Recent/Live Games */}
                {recentGames.length > 0 && (
                    <div className="games-section">
                        <h4 className="section-title">Recent Results</h4>
                        <div className="games-list">
                            {recentGames.slice(0, 5).map((game, index) => {
                                const gameStatus = getGameStatus(game);
                                const score = formatScore(game);
                                
                                return (
                                    <div key={game.id || index} className="game-item completed">
                                        <div className="game-teams">
                                            <div className="team away">
                                                <div className="team-info">
                                                    <span className="team-name">
                                                        {game.awayTeam?.name || 'Away'}
                                                    </span>
                                                    {score && (
                                                        <span className="team-score">
                                                            {game.awayScore}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="game-center">
                                                <div className="game-result">
                                                    <span className="status-icon">{gameStatus.icon}</span>
                                                    <span className="status-text">
                                                        {gameStatus.status}
                                                    </span>
                                                </div>
                                                {score && (
                                                    <div className="final-score">
                                                        {score}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="team home">
                                                <div className="team-info">
                                                    <span className="team-name">
                                                        {game.homeTeam?.name || 'Home'}
                                                    </span>
                                                    {score && (
                                                        <span className="team-score">
                                                            {game.homeScore}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="sports-footer">
                <div className="update-info">
                    <span className="update-time">
                        Updated {moment(sportsData.lastUpdated || Date.now()).fromNow()}
                    </span>
                    {sportsData.source && (
                        <span className="data-source">
                            via {sportsData.source}
                        </span>
                    )}
                </div>
                
                <button
                    onClick={refetch}
                    className="refresh-btn"
                    title="Refresh sports data"
                    disabled={isLoading}
                >
                    🔄
                </button>
            </div>
        </div>
    );
};

export default SportsSchedule;
