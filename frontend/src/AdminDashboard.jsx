import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Users, Utensils, ThumbsUp, MessageSquare, Menu, X, BarChart, TrendingUp, ChevronDown, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

// --- Configuration and Mock Data ---

const MOCK_DATA = {
  overview: {
    roomsCreated: 1500,
    votes: 45000,
    decisions: 800,
    ratings: { pending: 150, approved: 1200, rejected: 50 },
  },
  timeseries: [
    { date: 'Oct 28', rooms: 50, votes: 1500, decisions: 25, ratings: 40 },
    { date: 'Oct 29', rooms: 65, votes: 1800, decisions: 30, ratings: 55 },
    { date: 'Oct 30', rooms: 70, votes: 2100, decisions: 35, ratings: 60 },
    { date: 'Oct 31', rooms: 55, votes: 1650, decisions: 28, ratings: 45 },
    { date: 'Nov 01', rooms: 80, votes: 2400, decisions: 40, ratings: 70 },
    { date: 'Nov 02', rooms: 75, votes: 2250, decisions: 38, ratings: 65 },
    { date: 'Nov 03', rooms: 90, votes: 2700, decisions: 45, ratings: 80 },
  ],
  topRestaurants: [
    { restaurant: { id: 'r1', name: 'Gourmet Grill', address: '123 Main St' }, wins: 85, avgScore: 4.8 },
    { restaurant: { id: 'r2', name: 'Veggie Delight', address: '45 Green Ln' }, wins: 72, avgScore: 4.5 },
    { restaurant: { id: 'r3', name: 'The Burger Joint', address: '99 High Rd' }, wins: 68, avgScore: 4.2 },
    { restaurant: { id: 'r4', name: 'Sushi Central', address: '10 Dockside' }, wins: 60, avgScore: 4.7 },
    { restaurant: { id: 'r5', name: 'Pizza Paradise', address: '5th Ave' }, wins: 55, avgScore: 4.1 },
  ],
  content: [
    { id: 1, type: 'Review', content: 'Terrible service, food was cold.', author: 'User1', restaurant: 'Burger Joint', status: 'pending' },
    { id: 2, type: 'Photo', content: 'Image of moldy food.', author: 'User2', restaurant: 'Gourmet Grill', status: 'reported' },
    { id: 3, type: 'Comment', content: 'This place is a scam.', author: 'User3', restaurant: 'Pizza Paradise', status: 'pending' },
    { id: 4, type: 'Review', content: 'Amazing experience! Loved the atmosphere.', author: 'User4', restaurant: 'Veggie Delight', status: 'approved' },
  ]
};

const TABS = {
  ANALYTICS: 'analytics',
  MODERATION: 'moderation',
};

const CARD_STYLES = "bg-white p-4 sm:p-6 rounded-xl shadow-lg transition-all hover:shadow-xl border border-gray-100";
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  reported: 'bg-red-100 text-red-800 border-red-300',
};

// --- Utility Components ---

const MetricCard = ({ title, value, icon, color }) => {
  const IconComponent = icon;
  return (
    <div className={`${CARD_STYLES} flex items-center`}>
      <div className={`p-3 rounded-full ${color} text-white mr-4 shadow-lg`}>
        <IconComponent size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

const StatusTag = ({ status }) => (
  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[status]}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

// --- Analytics Tab Components ---

const OverviewStats = ({ data }) => {
  const ratingData = useMemo(() => [
    { name: 'Approved', value: data.ratings.approved, color: '#10B981' }, 
    { name: 'Pending', value: data.ratings.pending, color: '#F59E0B' },   
    { name: 'Rejected', value: data.ratings.rejected, color: '#EF4444' },  
  ], [data.ratings]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard title="Rooms Created" value={data.roomsCreated} icon={Users} color="bg-indigo-500" />
      <MetricCard title="Total Votes" value={data.votes} icon={ThumbsUp} color="bg-purple-500" />
      <MetricCard title="Decisions Made" value={data.decisions} icon={CheckCircle} color="bg-cyan-500" />
      <div className={`${CARD_STYLES} col-span-1`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rating Status</h3>
        <div className="h-40 sm:h-28"> 
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ratingData}
                dataKey="value"
                nameKey="name"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={5}
                labelLine={false}
              >
                {ratingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ padding: '0px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const TimeSeriesChart = ({ data }) => (
  <div className={`${CARD_STYLES} mt-6`}>
    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
      <BarChart size={20} className="mr-2 text-indigo-500" /> Activity Trend (Last 7 Days)
    </h3>
    <div className="h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="rooms" stroke="#4F46E5" strokeWidth={2} name="Rooms Created" />
          <Line type="monotone" dataKey="votes" stroke="#8B5CF6" strokeWidth={2} name="Total Votes" />
          <Line type="monotone" dataKey="decisions" stroke="#06B6D4" strokeWidth={2} name="Decisions" />
          <Line type="monotone" dataKey="ratings" stroke="#10B981" strokeWidth={2} name="New Ratings" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const TopRestaurantsTable = ({ data }) => (
  <div className={`${CARD_STYLES} mt-6`}>
    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
      <TrendingUp size={20} className="mr-2 text-green-600" /> Top Performing Restaurants (by Wins)
    </h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">Restaurant</th>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] hidden sm:table-cell">Address</th>
            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Score</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={item.restaurant.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.restaurant.name}</td>
              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{item.restaurant.address}</td>
              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-medium">{item.wins}</td>
              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.avgScore.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DashboardAnalytics = () => {
  const [data] = useState({
    overview: MOCK_DATA.overview,
    timeseries: MOCK_DATA.timeseries,
    topRestaurants: MOCK_DATA.topRestaurants,
    loading: false,
  });

  if (data.loading) return <div className="text-center py-10 text-gray-500">Loading Analytics...</div>;

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-2">System Analytics & Health</h2>
      <OverviewStats data={data.overview} />
      <TimeSeriesChart data={data.timeseries} />
      <TopRestaurantsTable data={data.topRestaurants} />
    </div>
  );
};

// --- Moderation Tab Component ---

const ContentModeration = () => {
  const [contentList, setContentList] = useState(MOCK_DATA.content);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, reported

  const filteredContent = contentList.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter || (filter === 'pending' && item.status === 'reported');
  });

  const handleAction = (id, newStatus) => {
    setContentList(prev => prev.map(item =>
      item.id === id ? { ...item, status: newStatus } : item
    ));
  };

  const statusOptions = ['all', 'pending', 'approved', 'rejected', 'reported'];

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-2">Content Moderation & Reports</h2>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-3 sm:space-y-0">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition duration-150 whitespace-nowrap ${
                s === filter
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({contentList.filter(c => c.status === s || (s === 'pending' && c.status === 'reported')).length})
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">Displaying **{filteredContent.length}** items.</p>
      </div>

      <div className="space-y-4">
        {filteredContent.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-xl text-gray-500">
            No {filter} content to moderate. Great job!
          </div>
        ) : (
          filteredContent.map(item => (
            <div key={item.id} className={`${CARD_STYLES} p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
              <div className="flex-grow min-w-0">
                <div className="flex items-center space-x-3 mb-2 flex-wrap">
                  <span className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {item.type} on **{item.restaurant}**
                  </span>
                  <StatusTag status={item.status} />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 italic break-words">"{(item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content)} "</p>
                <p className="text-xs text-gray-400 mt-1">By: {item.author}</p>
              </div>
              <div className="flex space-x-2 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                <button
                  onClick={() => handleAction(item.id, 'approved')}
                  className="p-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 transition"
                  title="Approve"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, 'rejected')}
                  className="p-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
                  title="Reject"
                >
                  <XCircle size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, 'deleted')}
                  className="p-2 text-sm text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
                  title="Delete/Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Main App Component (now named AdminDashboard) ---

/** The main Admin Dashboard application. */
export default function AdminDashboard() { 
  const [activeTab, setActiveTab] = useState(TABS.ANALYTICS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case TABS.ANALYTICS:
        return <DashboardAnalytics />;
      case TABS.MODERATION:
        return <ContentModeration />;
      default:
        return <DashboardAnalytics />;
    }
  };

  const NavItem = ({ tab, icon, label }) => {
    const IconComponent = icon;
    return (
      <button
        onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }}
        className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 text-left ${
          activeTab === tab
            ? 'bg-indigo-700 text-white shadow-lg'
            : 'text-indigo-200 hover:bg-indigo-700/50'
        }`}
      >
        <IconComponent size={20} className="mr-3" />
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-indigo-800 p-4 flex justify-between items-center shadow-lg sticky top-0 z-40">
        <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white p-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Overlay for Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar (Desktop & Mobile Overlay) */}
        <aside
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:sticky md:top-0 md:translate-x-0 transition-transform duration-300 ease-in-out w-64 h-full bg-indigo-900 z-30 p-6 flex flex-col shadow-2xl flex-shrink-0`}
        >
          <div className="mb-10 text-2xl font-extrabold text-white">
            🍴 Admin Panel
          </div>
          <nav className="space-y-3 flex-grow">
            <NavItem tab={TABS.ANALYTICS} icon={LayoutDashboard} label="Analytics & Health" />
            <NavItem tab={TABS.MODERATION} icon={MessageSquare} label="Content Moderation" />
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-grow p-4 md:p-10 z-10 w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
