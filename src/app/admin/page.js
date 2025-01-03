'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('registrations');
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [soloRegistrations, setSoloRegistrations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [teamStats, setTeamStats] = useState({
    total: 0,
    complete: 0,
    incomplete: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    avgTeamSize: 0,
    totalMembers: 0
  });
  const [showSkillAnalysis, setShowSkillAnalysis] = useState(false);
  const [skillStats, setSkillStats] = useState({
    topSkills: [],
    skillDistribution: {},
    teamSkillMatrix: [],
    averageSkillsPerTeam: 0
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentActivity, setRecentActivity] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    registrationTrend: [],
    skillDistribution: {},
    teamProgress: {}
  });
  const [selectedTeamForAnalysis, setSelectedTeamForAnalysis] = useState(null);
  const [selectedTeamForSuggestions, setSelectedTeamForSuggestions] = useState(null);
  const [teamSuggestions, setTeamSuggestions] = useState([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [yearFilter, setYearFilter] = useState('all');

  async function fetchRegistrations() {
    try {
      setLoading(true);
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Filter registrations based on search query and filters
      let filtered = registrations;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(reg => 
          reg.full_name?.toLowerCase().includes(query) ||
          reg.email?.toLowerCase().includes(query) ||
          reg.skills?.some(skill => skill.toLowerCase().includes(query))
        );
      }

      if (filter !== 'all') {
        filtered = filtered.filter(reg => reg.status === filter);
      }

      if (yearFilter !== 'all') {
        filtered = filtered.filter(reg => reg.year_of_study === yearFilter);
      }

      // Update stats
      const stats = {
        total: registrations.length,
        pending: registrations.filter(r => r.status === 'pending').length,
        approved: registrations.filter(r => r.status === 'approved').length,
        rejected: registrations.filter(r => r.status === 'rejected').length
      };

      // Update solo registrations
      const solo = registrations.filter(reg => 
        !reg.has_team || reg.has_team === 'no' || reg.has_team === 'form'
      );

      setRegistrations(filtered);
      setStats(stats);
      setSoloRegistrations(solo);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      alert('Error fetching registrations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations();
    } else {
      organizeTeams();
    }
  }, [filter, yearFilter, activeTab]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            setIsSidebarCollapsed(prev => !prev);
            break;
          case 'f':
            e.preventDefault();
            document.querySelector('input[type="search"]')?.focus();
            break;
          case 'n':
            e.preventDefault();
            setShowCreateTeamModal(true);
            break;
          // Add more shortcuts as needed
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Fetch recent activity
  async function fetchRecentActivity() {
    try {
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentActivity(registrations.map(reg => ({
        id: reg.id,
        type: 'registration',
        user: reg.full_name,
        action: 'registered',
        timestamp: reg.registered_at
      })));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  }

  // Bulk actions
  async function handleBulkAction(action) {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status: action })
        .in('id', selectedItems);

      if (error) throw error;
      
      setSelectedItems([]);
      if (activeTab === 'registrations') {
        fetchRegistrations();
      } else {
        organizeTeams();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Error performing bulk action. Please try again.');
    }
  }

  // Analytics data
  async function fetchAnalytics() {
    try {
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: true });

      if (error) throw error;

      // Registration trend
      const trend = registrations.reduce((acc, reg) => {
        const date = reg.registered_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Skill distribution
      const skills = {};
      registrations.forEach(reg => {
        reg.skills.forEach(skill => {
          skills[skill] = (skills[skill] || 0) + 1;
        });
      });

      // Team progress
      const progress = {
        total: teams.length,
        complete: teams.filter(t => t.members.length >= 3).length,
        incomplete: teams.filter(t => t.members.length < 3).length
      };

      setAnalyticsData({
        registrationTrend: Object.entries(trend).map(([date, count]) => ({ date, count })),
        skillDistribution: skills,
        teamProgress: progress
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }

  // Analytics Modal Component
  const AnalyticsModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-black/90 border border-white/10 rounded-2xl p-6 w-full max-w-5xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Analytics Dashboard</h3>
          <button
            onClick={() => setShowAnalytics(false)}
            className="text-white/60 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          {/* Registration Trend */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Registration Trend</h4>
            <div className="h-64 bg-white/5 rounded-lg p-4">
              {/* Add chart visualization here */}
              <div className="flex h-full items-end space-x-2">
                {analyticsData.registrationTrend.map(({ date, count }) => (
                  <div
                    key={date}
                    className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors rounded-t"
                    style={{ height: `${(count / Math.max(...analyticsData.registrationTrend.map(d => d.count))) * 100}%` }}
                  >
                    <div className="transform -rotate-90 text-xs text-white/60 mt-2">{format(new Date(date), 'MMM d')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skill Distribution */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Skill Distribution</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(analyticsData.skillDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 9)
                .map(([skill, count]) => (
                  <div key={skill} className="bg-white/5 rounded-lg p-4">
                    <div className="text-white font-medium">{skill}</div>
                    <div className="text-white/60">{count} participants</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Team Formation Progress */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Team Formation Progress</h4>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(analyticsData.teamProgress.complete / analyticsData.teamProgress.total) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-white/60">{analyticsData.teamProgress.complete} complete teams</span>
                <span className="text-white/60">{analyticsData.teamProgress.incomplete} incomplete teams</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Notifications Panel Component
  const NotificationsPanel = () => (
    <div className="fixed inset-y-0 right-0 w-80 bg-black/90 border-l border-white/10 p-4 transform transition-transform duration-200 ease-in-out"
         style={{ transform: showNotifications ? 'translateX(0)' : 'translateX(100%)' }}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
        <button
          onClick={() => setShowNotifications(false)}
          className="text-white/60 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {notifications.map((notification, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-3">
            <div className="text-sm text-white">{notification.message}</div>
            <div className="text-xs text-white/60 mt-1">{format(new Date(notification.timestamp), 'PPp')}</div>
          </div>
        ))}
      </div>
    </div>
  );

  function calculateTeamCompatibility(team) {
    if (!team || !team.members || team.members.length === 0) return 0;

    // Calculate skill diversity score
    const uniqueSkills = new Set(team.members.flatMap(m => m.skills));
    const skillDiversityScore = uniqueSkills.size / (team.members.length * 5); // Assuming average of 5 skills per person

    // Calculate experience balance score
    const experienceLevels = {
      'Beginner': 1,
      'Intermediate': 2,
      'Advanced': 3
    };
    const avgExperience = team.members.reduce((sum, m) => sum + experienceLevels[m.experience], 0) / team.members.length;
    const experienceBalanceScore = Math.min(avgExperience / 3, 1); // Normalize to 0-1

    // Calculate year distribution score
    const years = new Set(team.members.map(m => m.year));
    const yearDiversityScore = years.size / 3; // Normalize by max possible years (L1, L2, L3)

    // Calculate skill complementarity score
    const skillOverlap = team.members.reduce((overlap, m1, i) => {
      team.members.slice(i + 1).forEach(m2 => {
        const commonSkills = m1.skills.filter(s => m2.skills.includes(s));
        overlap += commonSkills.length;
      });
      return overlap;
    }, 0);
    const maxPossibleOverlap = (team.members.length * (team.members.length - 1)) / 2 * 5; // Assuming max 5 common skills
    const skillComplementarityScore = 1 - (skillOverlap / maxPossibleOverlap);

    // Calculate final compatibility score (weighted average)
    const weights = {
      skillDiversity: 0.3,
      experienceBalance: 0.25,
      yearDiversity: 0.2,
      skillComplementarity: 0.25
    };

    const compatibilityScore = (
      skillDiversityScore * weights.skillDiversity +
      experienceBalanceScore * weights.experienceBalance +
      yearDiversityScore * weights.yearDiversity +
      skillComplementarityScore * weights.skillComplementarity
    ) * 100;

    return Math.round(compatibilityScore);
  }

  function analyzeTeamSkills(teams) {
    // Collect all unique skills
    const allSkills = new Set();
    const skillCount = {};
    let totalSkills = 0;
    
    teams.forEach(team => {
      // Calculate skill coverage for each team
      const teamSkills = {};
      team.members.forEach(member => {
        member.skills.forEach(skill => {
          allSkills.add(skill);
          skillCount[skill] = (skillCount[skill] || 0) + 1;
          teamSkills[skill] = (teamSkills[skill] || 0) + 1;
          totalSkills++;
        });
      });
      team.skillCoverage = teamSkills;
      
      // Calculate team compatibility score
      team.compatibilityScore = calculateTeamCompatibility(team);
    });

    // Calculate top skills
    const topSkills = Object.entries(skillCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({
        skill,
        count,
        percentage: ((count / totalSkills) * 100).toFixed(1)
      }));

    // Calculate skill distribution per team
    const teamSkillMatrix = teams.map(team => {
      const skills = {};
      allSkills.forEach(skill => {
        skills[skill] = team.members.filter(member => 
          member.skills.includes(skill)
        ).length;
      });
      return {
        teamName: team.name,
        memberCount: team.members.length,
        skills,
        uniqueSkills: new Set(team.members.flatMap(m => m.skills)).size,
        totalSkills: team.members.flatMap(m => m.skills).length,
        compatibilityScore: team.compatibilityScore
      };
    });

    setSkillStats({
      topSkills,
      skillDistribution: skillCount,
      teamSkillMatrix,
      averageSkillsPerTeam: totalSkills / teams.length || 0,
      averageCompatibility: teams.reduce((sum, team) => sum + team.compatibilityScore, 0) / teams.length || 0
    });
  }

  function findTeamSuggestions(team, availableMembers) {
    if (!team || !team.members || team.members.length >= 3) return [];

    const neededMembers = 3 - team.members.length;
    const suggestions = [];

    // Get current team's skills and experience levels
    const teamSkills = new Set(team.members.flatMap(m => m.skills));
    const teamExperience = new Set(team.members.map(m => m.experience));
    const teamYears = new Set(team.members.map(m => m.year));

    // Score each available member
    const scoredMembers = availableMembers.map(member => {
      let score = 0;

      // Skill complementarity (higher score for new skills)
      const newSkills = member.skills.filter(skill => !teamSkills.has(skill));
      score += newSkills.length * 2;

      // Experience diversity (higher score for new experience levels)
      if (!teamExperience.has(member.experience)) {
        score += 3;
      }

      // Year diversity (higher score for new years)
      if (!teamYears.has(member.year)) {
        score += 2;
      }

      return { member, score };
    });

    // Sort by score and get top suggestions
    const topSuggestions = scoredMembers
      .sort((a, b) => b.score - a.score)
      .slice(0, neededMembers);

    // Calculate potential team compatibility with each suggestion
    topSuggestions.forEach(({ member }) => {
      const potentialTeam = {
        members: [...team.members, member]
      };
      const compatibilityScore = calculateTeamCompatibility(potentialTeam);
      suggestions.push({
        member,
        compatibilityScore,
        newSkills: member.skills.filter(skill => !teamSkills.has(skill))
      });
    });

    return suggestions;
  }

  const TeamSuggestionsModal = ({ team, suggestions, onClose, onAddMember }) => {
    if (!team || !suggestions || suggestions.length === 0) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
        <div className="bg-black/90 border border-white/10 rounded-2xl p-6 w-full max-w-3xl mx-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Suggested Team Members</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {suggestions.map(({ member, compatibilityScore, newSkills }) => (
              <div
                key={member.id}
                className="bg-white/5 rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-white">{member.name}</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                      {compatibilityScore}% Match
                    </span>
                  </div>
                  <p className="text-white/60 text-sm">{member.email}</p>
                  <p className="text-white/60 text-sm">
                    {member.year} • {member.experience}
                  </p>
                  <div className="mt-2">
                    <div className="text-white/40 text-xs mb-1">New Skills Added:</div>
                    <div className="flex flex-wrap gap-1">
                      {newSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAddMember(member)}
                  className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors whitespace-nowrap"
                >
                  Add to Team
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TeamCompatibilityModal = ({ team, onClose }) => {
    if (!team) return null;

    const compatibilityScore = team.compatibilityScore || 0;
    const getScoreColor = (score) => {
      if (score >= 80) return 'text-emerald-400 bg-emerald-500/10';
      if (score >= 60) return 'text-blue-400 bg-blue-500/10';
      if (score >= 40) return 'text-yellow-400 bg-yellow-500/10';
      return 'text-red-400 bg-red-500/10';
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-8">
        <div className="bg-black/90 border border-white/10 rounded-2xl p-6 w-full max-w-3xl mx-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Team Compatibility Analysis</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-8">
            {/* Overall Score */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${getScoreColor(compatibilityScore)}`}>
                  {compatibilityScore}%
                </div>
                <div className="text-white/60">Overall Compatibility</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Skill Diversity */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white/60 mb-3">Skill Diversity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white">Unique Skills</span>
                    <span className="text-white/60">{new Set(team.members.flatMap(m => m.skills)).size}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white">Skills per Member</span>
                    <span className="text-white/60">
                      {(team.members.reduce((sum, m) => sum + m.skills.length, 0) / team.members.length).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Experience Balance */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white/60 mb-3">Experience Balance</h4>
                <div className="space-y-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(level => {
                    const count = team.members.filter(m => m.experience === level).length;
                    return (
                      <div key={level} className="flex justify-between items-center text-sm">
                        <span className="text-white">{level}</span>
                        <span className="text-white/60">{count} member{count !== 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Year Distribution */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white/60 mb-3">Study Years</h4>
                <div className="space-y-2">
                  {['L1', 'L2', 'L3'].map(year => {
                    const count = team.members.filter(m => m.year === year).length;
                    return (
                      <div key={year} className="flex justify-between items-center text-sm">
                        <span className="text-white/80">{year}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-white/10 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 rounded-full h-1.5"
                              style={{ width: `${(count / team.members.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-white/40 text-sm">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skill Complementarity */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white/60 mb-3">Skill Complementarity</h4>
                <div className="space-y-2">
                  {Object.entries(team.skillCoverage || {}).map(([skill, count]) => (
                    <div key={skill} className="flex justify-between items-center text-sm">
                      <span className="text-white">{skill}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-white/10 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 rounded-full h-1.5"
                            style={{ width: `${(count / team.members.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-white/60">{count}/{team.members.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white/60 mb-3">Recommendations</h4>
              <ul className="space-y-2 text-sm">
                {compatibilityScore < 80 && (
                  <>
                    {team.members.length < 3 && (
                      <li className="text-white/60">
                        • Add more team members to increase skill diversity
                      </li>
                    )}
                    {new Set(team.members.map(m => m.experience)).size < 2 && (
                      <li className="text-white/60">
                        • Consider adding members with different experience levels
                      </li>
                    )}
                    {new Set(team.members.map(m => m.year)).size < 2 && (
                      <li className="text-white/60">
                        • Team could benefit from more year diversity
                      </li>
                    )}
                    {Object.values(team.skillCoverage || {}).every(count => count === team.members.length) && (
                      <li className="text-white/60">
                        • Consider adding members with complementary skills
                      </li>
                    )}
                  </>
                )}
                {compatibilityScore >= 80 && (
                  <li className="text-emerald-400">
                    • Great team composition! All aspects are well balanced.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleShowSuggestions = (team) => {
    const availableMembers = soloRegistrations.filter(reg => 
      !reg.has_team || reg.has_team === 'no' || reg.has_team === 'form'
    );
    const suggestions = findTeamSuggestions(team, availableMembers);
    setTeamSuggestions(suggestions);
    setSelectedTeamForSuggestions(team);
  };

  const handleAddSuggestedMember = async (member) => {
    if (!selectedTeamForSuggestions) return;

    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          has_team: 'yes',
          team_name: selectedTeamForSuggestions.name,
          status: 'pending'
        })
        .eq('id', member.id);

      if (error) throw error;

      // Close the suggestions modal and refresh teams
      setSelectedTeamForSuggestions(null);
      setTeamSuggestions([]);
      organizeTeams();
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Error adding team member. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Error logging out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const exportTeamData = () => {
    // Create CSV headers
    const headers = [
      'Team Name',
      'Status',
      'Member Count',
      'Compatibility Score',
      'Members',
      'Skills',
      'Experience Levels',
      'Study Years'
    ].join(',');

    // Convert team data to CSV rows
    const rows = teams.map(team => {
      const members = team.members.map(m => m.name).join('; ');
      const skills = [...new Set(team.members.flatMap(m => m.skills))].join('; ');
      const experience = [...new Set(team.members.map(m => m.experience))].join('; ');
      const years = [...new Set(team.members.map(m => m.year))].join('; ');

      return [
        team.name,
        team.status,
        team.members.length,
        team.compatibilityScore || 'N/A',
        `"${members}"`,
        `"${skills}"`,
        `"${experience}"`,
        `"${years}"`
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers, ...rows].join('\n');

    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `teams_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter teams based on search query and team filter
  const filteredTeams = teams.filter(team => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const teamMatches = team.name.toLowerCase().includes(query);
      const memberMatches = team.members.some(member => 
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.skills.some(skill => skill.toLowerCase().includes(query))
      );
      if (!teamMatches && !memberMatches) return false;
    }

    // Team status filter
    if (teamFilter !== 'all') {
      if (teamFilter === 'complete' && team.members.length < 3) return false;
      if (teamFilter === 'incomplete' && team.members.length >= 3) return false;
      if (['approved', 'pending', 'rejected'].includes(teamFilter) && team.status !== teamFilter) return false;
    }

    return true;
  });

  // Add after the fetchRegistrations function

  async function organizeTeams() {
    try {
      setLoading(true);
      const { data: registrations, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Group registrations by team
      const teamGroups = {};
      registrations.forEach(reg => {
        if (reg.has_team === 'yes' && reg.team_name) {
          if (!teamGroups[reg.team_name]) {
            teamGroups[reg.team_name] = {
              name: reg.team_name,
              status: reg.status,
              members: []
            };
          }
          teamGroups[reg.team_name].members.push({
            id: reg.id,
            name: reg.full_name,
            email: reg.email,
            year: reg.year_of_study,
            experience: reg.experience_level,
            skills: reg.skills || []
          });
        }
      });

      // Convert to array and calculate team stats
      const teamsArray = Object.values(teamGroups);
      
      // Calculate compatibility scores and analyze skills
      teamsArray.forEach(team => {
        team.compatibilityScore = calculateTeamCompatibility(team);
        
        // Calculate skill coverage
        const skillCoverage = {};
        team.members.forEach(member => {
          member.skills.forEach(skill => {
            skillCoverage[skill] = (skillCoverage[skill] || 0) + 1;
          });
        });
        team.skillCoverage = skillCoverage;
      });

      // Calculate team statistics
      const stats = {
        total: teamsArray.length,
        complete: teamsArray.filter(t => t.members.length >= 3).length,
        incomplete: teamsArray.filter(t => t.members.length < 3).length,
        approved: teamsArray.filter(t => t.status === 'approved').length,
        pending: teamsArray.filter(t => t.status === 'pending').length,
        rejected: teamsArray.filter(t => t.status === 'rejected').length,
        totalMembers: teamsArray.reduce((sum, t) => sum + t.members.length, 0),
        avgTeamSize: teamsArray.length ? 
          teamsArray.reduce((sum, t) => sum + t.members.length, 0) / teamsArray.length : 
          0
      };

      setTeams(teamsArray);
      setTeamStats(stats);
      analyzeTeamSkills(teamsArray);
    } catch (error) {
      console.error('Error organizing teams:', error);
      alert('Error organizing teams. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Add after the handleAddSuggestedMember function

  async function updateTeamStatus(teamName, newStatus) {
    try {
      // Get all team members first
      const { data: teamMembers, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .eq('team_name', teamName)
        .eq('has_team', 'yes');

      if (fetchError) throw fetchError;

      // Update all team members' status
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('team_name', teamName)
        .eq('has_team', 'yes');

      if (updateError) throw updateError;

      // Send email notifications to all team members
      for (const member of teamMembers) {
        await sendEmailNotification(member.email, member.full_name, newStatus, teamName);
      }

      // Refresh teams data
      organizeTeams();

      // Add notification
      const notification = {
        message: `Team "${teamName}" has been ${newStatus}`,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notification, ...prev]);
    } catch (error) {
      console.error('Error updating team status:', error);
      alert('Error updating team status. Please try again.');
    }
  }

  // Add after the handleAddSuggestedMember function

  async function removeMemberFromTeam(memberId) {
    try {
      // Get member details first
      const { data: member, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', memberId)
        .single();

      if (fetchError) throw fetchError;

      const teamName = member.team_name;

      // Update the member's registration
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          has_team: 'no',
          team_name: null,
          status: 'pending'
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      // Send email notification
      await sendEmailNotification(member.email, member.full_name, 'removed', teamName);

      // Add notification
      const notification = {
        message: 'Member removed from team',
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notification, ...prev]);

      // Refresh teams data
      organizeTeams();
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Error removing team member. Please try again.');
    }
  }

  // Add after the handleAddSuggestedMember function

  async function updateStatus(registrationId, newStatus) {
    try {
      // Get registration details first
      const { data: registration, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (fetchError) throw fetchError;

      // Update the registration status
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', registrationId);

      if (updateError) throw updateError;

      // Send email notification
      await sendEmailNotification(registration.email, registration.full_name, newStatus);

      // Add notification
      const notification = {
        message: `Registration status updated to ${newStatus}`,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notification, ...prev]);

      // Refresh registrations data
      fetchRegistrations();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    }
  }

  // Add after the updateStatus function

  async function sendEmailNotification(email, name, status, teamName = null) {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `DevImpact Hackathon Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          template: status,
          data: {
            name: name,
            status: status,
            teamName: teamName
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-black/50 border-r border-white/10 backdrop-blur-sm fixed h-full transition-all duration-200 ease-in-out`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-semibold text-white">DevImpact Admin</h1>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="text-white/60 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d={isSidebarCollapsed 
                        ? "M13 5l7 7-7 7M5 5l7 7-7 7" 
                        : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
              </svg>
            </button>
          </div>
          
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('registrations')}
              className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                activeTab === 'registrations'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Registrations
              {stats.pending > 0 && (
                <span className="ml-auto bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-xs">
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                activeTab === 'teams'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Teams
              {teamStats.pending > 0 && (
                <span className="ml-auto bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-xs">
                  {teamStats.pending}
                </span>
              )}
            </button>
            
            {/* Quick Actions */}
            {!isSidebarCollapsed && (
              <div className="mt-8 space-y-2">
                <div className="text-xs font-medium text-white/40 uppercase">Quick Actions</div>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Team
                </button>
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </button>
                <button
                  onClick={() => setShowNotifications(true)}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                  {notifications.length > 0 && (
                    <span className="ml-auto bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full text-xs">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Keyboard Shortcuts Help */}
        {!isSidebarCollapsed && (
          <div className="absolute bottom-16 left-0 right-0 p-4">
            <div className="text-xs text-white/40">
              <div className="mb-2 font-medium uppercase">Keyboard Shortcuts</div>
              <div className="space-y-1">
                <div>⌘/Ctrl + B - Toggle Sidebar</div>
                <div>⌘/Ctrl + F - Focus Search</div>
                <div>⌘/Ctrl + N - New Team</div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors flex items-center gap-3 ${
              isSidebarCollapsed ? 'justify-center' : ''
            } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && (isLoggingOut ? 'Logging out...' : 'Logout')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-200 ease-in-out`}>
        <main className="max-w-7xl mx-auto px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/60 mb-8">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-white">{activeTab === 'registrations' ? 'Registrations' : 'Teams'}</span>
          </div>

          {/* Welcome Section */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {format(currentTime, 'EEEE, MMMM d')}
                </h2>
                <p className="text-white/60 mt-1">
                  {format(currentTime, 'h:mm a')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-white/60">Total Registrations</div>
                <div className="text-3xl font-bold text-white">{stats.total}</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-white/60 uppercase mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-white">{activity.user}</span>
                      <span className="text-white/60"> {activity.action}</span>
                    </div>
                    <span className="ml-auto text-white/40">{format(new Date(activity.timestamp), 'h:mm a')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {activeTab === 'registrations' ? (
            // Enhanced Registrations View
            <>
              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-4 py-3 flex items-center gap-4 z-50">
                  <span className="text-white/60">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkAction('approved')}
                      className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                    >
                      Approve All
                    </button>
                    <button
                      onClick={() => handleBulkAction('rejected')}
                      className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      Reject All
                    </button>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {/* ... rest of registrations content ... */}
              <div className="space-y-6">
                {/* Enhanced Filters */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <input
                        type="search"
                        placeholder="Search by name, email, or skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                      >
                        <option value="all">All Years</option>
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                      </select>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilter('all');
                          setYearFilter('all');
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Registration Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="text-white/60 text-sm">Total</div>
                    <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="text-yellow-500/60 text-sm">Pending</div>
                    <div className="text-2xl font-bold text-yellow-500 mt-1">{stats.pending}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="text-emerald-500/60 text-sm">Approved</div>
                    <div className="text-2xl font-bold text-emerald-500 mt-1">{stats.approved}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="text-red-500/60 text-sm">Rejected</div>
                    <div className="text-2xl font-bold text-red-500 mt-1">{stats.rejected}</div>
                  </div>
                </div>

                {/* Registrations List */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : registrations.length > 0 ? (
                    registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(reg.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, reg.id]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(id => id !== reg.id));
                                  }
                                }}
                                className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                              />
                              <h3 className="text-xl font-semibold text-white">{reg.full_name}</h3>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  reg.status === 'pending'
                                    ? 'bg-yellow-500/10 text-yellow-500'
                                    : reg.status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-red-500/10 text-red-400'
                                }`}
                              >
                                {reg.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-white/60">
                                  <span className="text-white/40">Email:</span> {reg.email}
                                </p>
                                <p className="text-white/60">
                                  <span className="text-white/40">Year:</span> {reg.year_of_study}
                                </p>
                                <p className="text-white/60">
                                  <span className="text-white/40">Experience:</span> {reg.experience_level}
                                </p>
                              </div>

                              {reg.has_team === 'yes' && (
                                <div>
                                  <p className="text-white/80 font-medium mb-1">Team: {reg.team_name}</p>
                                  <div className="space-y-1">
                                    {reg.team_members?.map((member, index) => (
                                      <p key={index} className="text-white/60">• {member}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Skills */}
                            <div className="mt-4">
                              <div className="flex flex-wrap gap-2">
                                {reg.skills?.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Additional Notes */}
                            {reg.additional_notes && (
                              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                                <p className="text-white/60">{reg.additional_notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => updateStatus(reg.id, 'approved')}
                              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(reg.id, 'rejected')}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-white/40 text-lg">No registrations found</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Enhanced Teams View
            <>
              {/* Team Management Header */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Team Management</h2>
                    <p className="text-white/60">Organize and manage hackathon teams</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCreateTeamModal(true)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Team
                    </button>
                    <button
                      onClick={exportTeamData}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Teams
                    </button>
                  </div>
                </div>
              </div>

              {/* Team Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-white/60 text-sm">Total Teams</div>
                  <div className="text-2xl font-bold text-white mt-1">{teamStats.total}</div>
                  <div className="text-white/40 text-sm mt-1">
                    {teamStats.totalMembers} total members
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-emerald-500/60 text-sm">Complete Teams</div>
                  <div className="text-2xl font-bold text-emerald-500 mt-1">{teamStats.complete}</div>
                  <div className="text-white/40 text-sm mt-1">
                    Avg. {teamStats.avgTeamSize.toFixed(1)} members/team
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-yellow-500/60 text-sm">Incomplete Teams</div>
                  <div className="text-2xl font-bold text-yellow-500 mt-1">{teamStats.incomplete}</div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-blue-500/60 text-sm">Available Members</div>
                  <div className="text-2xl font-bold text-blue-500 mt-1">{soloRegistrations.length}</div>
                </div>
              </div>

              {/* Team Filters and Search */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="search"
                      placeholder="Search teams or members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    >
                      <option value="all">All Teams</option>
                      <option value="complete">Complete</option>
                      <option value="incomplete">Incomplete</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setTeamFilter('all');
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Teams List */}
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </div>
                ) : filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <div
                      key={team.name}
                      className="bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">{team.name}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                team.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-500'
                                  : team.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {team.status}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                team.members.length >= 3
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-yellow-500/10 text-yellow-500'
                              }`}
                            >
                              {team.members.length >= 3 ? 'Complete' : 'Incomplete'}
                            </span>
                          </div>
                          <p className="text-white/60 mt-1">
                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {/* Team Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedTeamForAnalysis(team)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Analyze Team
                          </button>
                          <button
                            onClick={() => updateTeamStatus(team.name, 'approved')}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                          >
                            Approve Team
                          </button>
                          <button
                            onClick={() => updateTeamStatus(team.name, 'rejected')}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          >
                            Reject Team
                          </button>
                        </div>
                      </div>

                      {/* Team Analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                        {/* Skill Coverage */}
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white/60 mb-2">Skill Coverage</h4>
                          <div className="space-y-2">
                            {Object.entries(team.skillCoverage || {}).map(([skill, count]) => (
                              <div key={skill} className="flex items-center justify-between">
                                <span className="text-white/80">{skill}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-white/10 rounded-full h-1.5">
                                    <div
                                      className="bg-emerald-500 rounded-full h-1.5"
                                      style={{ width: `${(count / team.members.length) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-white/40 text-sm">{count}/{team.members.length}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Experience Distribution */}
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white/60 mb-2">Experience Levels</h4>
                          <div className="space-y-2">
                            {['Beginner', 'Intermediate', 'Advanced'].map(level => {
                              const count = team.members.filter(m => m.experience === level).length;
                              return (
                                <div key={level} className="flex items-center justify-between">
                                  <span className="text-white/80">{level}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-white/10 rounded-full h-1.5">
                                      <div
                                        className="bg-blue-500 rounded-full h-1.5"
                                        style={{ width: `${(count / team.members.length) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-white/40 text-sm">{count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Year Distribution */}
                        <div className="bg-white/5 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white/60 mb-2">Study Years</h4>
                          <div className="space-y-2">
                            {['L1', 'L2', 'L3'].map(year => {
                              const count = team.members.filter(m => m.year === year).length;
                              return (
                                <div key={year} className="flex items-center justify-between">
                                  <span className="text-white/80">{year}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-white/10 rounded-full h-1.5">
                                      <div
                                        className="bg-purple-500 rounded-full h-1.5"
                                        style={{ width: `${(count / team.members.length) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-white/40 text-sm">{count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Team Members */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="bg-white/5 rounded-lg p-4 flex justify-between items-start"
                          >
                            <div>
                              <p className="text-white font-medium">{member.name}</p>
                              <p className="text-white/60 text-sm">{member.email}</p>
                              <p className="text-white/60 text-sm">
                                {member.year} • {member.experience}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {member.skills.map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => removeMemberFromTeam(member.id)}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}

                        {/* Add Member Button (if team is incomplete) */}
                        {team.members.length < 3 && (
                          <button
                            onClick={() => handleShowSuggestions(team)}
                            className="bg-white/5 rounded-lg p-4 flex items-center justify-center gap-2 text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Find Members
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-white/40 text-lg">
                      {searchQuery ? 'No teams match your search' : 'No teams found'}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modals and Panels */}
      {showSkillAnalysis && <SkillAnalysisModal />}
      {showAnalytics && <AnalyticsModal />}
      {showNotifications && <NotificationsPanel />}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Team</h3>
              <button
                onClick={() => setShowCreateTeamModal(false)}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Enter team name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Select Team Members
                </label>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 -mr-2">
                  {soloRegistrations.map((reg) => (
                    <label
                      key={reg.id}
                      className="flex items-center gap-3 p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/[0.07] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(reg.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, reg.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== reg.id));
                          }
                        }}
                        className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-medium">{reg.full_name}</p>
                          <span className="text-white/40 text-sm">{reg.year_of_study}</span>
                        </div>
                        <p className="text-white/60 text-sm">{reg.email}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {reg.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-white/60 text-sm">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateTeamModal(false);
                      setTeamName('');
                      setSelectedMembers([]);
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (teamName && selectedMembers.length > 0) {
                        createTeam(teamName, selectedMembers);
                        setShowCreateTeamModal(false);
                        setTeamName('');
                        setSelectedMembers([]);
                      }
                    }}
                    disabled={!teamName || selectedMembers.length === 0}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedTeamForAnalysis && (
        <TeamCompatibilityModal
          team={selectedTeamForAnalysis}
          onClose={() => setSelectedTeamForAnalysis(null)}
        />
      )}
      {selectedTeamForSuggestions && (
        <TeamSuggestionsModal
          team={selectedTeamForSuggestions}
          suggestions={teamSuggestions}
          onClose={() => {
            setSelectedTeamForSuggestions(null);
            setTeamSuggestions([]);
          }}
          onAddMember={handleAddSuggestedMember}
        />
      )}
    </div>
  );
} 