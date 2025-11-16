import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./header";
import {
  LayoutDashboard,
  Users,
  ThumbsUp,
  CheckCircle,
  MessageSquare,
  BarChart,
  TrendingUp,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  BarChart as RechartsBarChart, // Renamed to avoid conflict with lucide-react
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { config } from "./config";

// --- Configuration Constants ---
const TABS = {
  ANALYTICS: "analytics",
  MODERATION: "moderation",
};

const CARD_STYLES =
  "bg-white p-4 sm:p-6 rounded-xl shadow-lg transition-all hover:shadow-xl border border-gray-100";
  
// Map moderation status to Tailwind classes for visual feedback
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  reported: "bg-red-100 text-red-800 border-red-300",
  deleted: "bg-gray-100 text-gray-800 border-gray-300",
};

// --- Utility Components ---

/**
 * Renders a key performance metric card.
 */
const MetricCard = ({ title, value, icon: Icon, color }) => (
  <div className={`${CARD_STYLES} flex items-center justify-between`}>
    <div className={`p-3 rounded-full ${color} text-white mr-4 shadow-lg`}>
      <Icon size={24} />
    </div>
    <div className="text-right flex-grow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {/* Use optional chaining for robustness */}
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
        {value?.toLocaleString?.() ?? "0"}
      </p>
    </div>
  </div>
);

/**
 * Renders a stylized status tag.
 */
const StatusTag = ({ status }) => {
  // Guard against null/undefined status
  const safeStatus = status || 'deleted'; 
  const displayStatus = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[safeStatus]}`}
    >
      {displayStatus}
    </span>
  );
};

// --- Analytics Tab Components ---

/**
 * Displays core overview metrics and rating status distribution.
 */
const OverviewStats = ({ overviewData, engagementData }) => {
  const engagement = engagementData || {}; 

  const data = useMemo(() => overviewData || {}, [overviewData]);

  const ratingData = useMemo(() => {
    const r = data.ratings || { approved: 0, pending: 0, rejected: 0 };
    return [
      { name: "Approved", value: r.approved, color: "#10B981" }, // Green-500
      { name: "Pending", value: r.pending, color: "#F59E0B" }, // Yellow-500
      { name: "Rejected", value: r.rejected, color: "#EF4444" }, // Red-500
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
      {/* System Metrics */}
      <MetricCard
        title="Rooms Created"
        value={data.roomsCreated ?? 0}
        icon={Users}
        color="bg-indigo-500"
      />
      <MetricCard
        title="Total Votes"
        value={data.votes ?? 0}
        icon={ThumbsUp}
        color="bg-purple-500"
      />
      <MetricCard
        title="Decisions Made"
        value={data.decisions ?? 0}
        icon={CheckCircle}
        color="bg-cyan-500"
      />

      {/* Engagement Metrics */}
      <MetricCard
        title="Avg Participants/Room"
        value={engagement.avgParticipantsPerRoom?.toFixed(1)}
        icon={Users}
        color="bg-teal-500"
      />
      <MetricCard
        title="Avg Votes/Room"
        value={engagement.avgVotesPerRoom?.toFixed(1)}
        icon={ThumbsUp}
        color="bg-pink-500"
      />

      {/* Rating Status Pie Chart */}
      <div className={`${CARD_STYLES} flex flex-col`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Rating Status
        </h3>
        <div className="flex-grow h-40 sm:h-28">
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
                {ratingData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/**
 * Displays system activity trends over time.
 */
const TimeSeriesChart = ({ data }) => {
    const chartData = Array.isArray(data) ? data : [];
    
    return (
        <div className={`${CARD_STYLES} mt-6`}>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart size={20} className="mr-2 text-indigo-500" /> Activity Trend
                (Last 7 Days)
            </h3>
            <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="rooms"
                            stroke="#4F46E5" // Indigo-600
                            strokeWidth={2}
                            name="Rooms Created"
                        />
                        <Line
                            type="monotone"
                            dataKey="votes"
                            stroke="#8B5CF6" // Purple-500
                            strokeWidth={2}
                            name="Total Votes"
                        />
                        <Line
                            type="monotone"
                            dataKey="decisions"
                            stroke="#06B6D4" // Cyan-500
                            strokeWidth={2}
                            name="Decisions"
                        />
                        <Line
                            type="monotone"
                            dataKey="ratings"
                            stroke="#10B981" // Green-500
                            strokeWidth={2}
                            name="New Ratings"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

/**
 * Displays a table of top-performing restaurants.
 */
const TopRestaurantsTable = ({ data }) => {
  const restaurants = Array.isArray(data) ? data : [];

  return (
    <div className={`${CARD_STYLES} mt-6`}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp size={20} className="mr-2 text-green-600" /> Top Performing
        Restaurants (by Wins)
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Restaurant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                Address
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wins
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg. Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {restaurants.map((item, index) => {
              const rest = item.restaurant || {};
              return (
                <tr
                  key={rest.id || index} // Use a unique ID or index as fallback
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rest.name || "N/A"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    {rest.address || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-medium">
                    {item.wins ?? 0}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {item.avgScore?.toFixed(1) ?? "0.0"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Dashboard Analytics Component (Container) ---

const DashboardAnalytics = () => {
  const [data, setData] = useState({
    overview: null,
    timeseries: [],
    topRestaurants: [],
    engagement: null,
    loading: true,
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const endpoints = [
          `${config.endpoints.analytics}/engagement`,
          `${config.endpoints.analytics}/overview`,
          `${config.endpoints.analytics}/timeseries`,
          `${config.endpoints.analytics}/top-restaurants`,
        ];

        const fetchOptions = { credentials: "include" };

        const [engagementRes, overviewRes, timeseriesRes, topRes] = await Promise.all(
          endpoints.map(url => fetch(url, fetchOptions))
        );

        let overview = null;
        let timeseries = [];
        let topRestaurants = [];
        let engagement = null;

        // Helper function for safe JSON parsing
        const parseJson = async (res, name) => {
          if (!res.ok) {
            console.warn(`Fetch for ${name} failed with status: ${res.status}`);
            return null;
          }
          try {
            return await res.json();
          } catch (e) {
            console.warn(`Failed to parse ${name} JSON`, e);
            return null;
          }
        };

        engagement = await parseJson(engagementRes, 'engagement');
        
        const overviewRaw = await parseJson(overviewRes, 'overview');
        overview = overviewRaw?.totals || null;
        
        const timeseriesRaw = await parseJson(timeseriesRes, 'timeseries');
        timeseries = Array.isArray(timeseriesRaw) ? timeseriesRaw : [];

        const topResRaw = await parseJson(topRes, 'top-restaurants');
        topRestaurants = Array.isArray(topResRaw?.items) ? topResRaw.items : [];

        setData({
          overview,
          timeseries,
          topRestaurants,
          engagement,
          loading: false,
        });
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchAnalyticsData();
  }, []);


  if (data.loading)
    return (
      <div className="text-center py-10 text-gray-500">
        <p>Loading System Analytics...</p>
      </div>
    );

  if (!data.overview)
    return (
      <div className="text-center py-10 text-red-500 bg-red-50 rounded-xl m-4">
        <p className="font-medium">
          Error: Failed to load core analytics data. Please check the backend service.
        </p>
      </div>
    );

  return (
    <div className="space-y-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        📊 System Analytics & Health
      </h2>
      <OverviewStats overviewData={data.overview} engagementData={data.engagement} />
      <TimeSeriesChart data={data.timeseries} />
      <TopRestaurantsTable data={data.topRestaurants} />
    </div>
  );
};

// --- Content Moderation Component ---

const ContentModeration = () => {
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.endpoints.content}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch content");
      const data = await res.json();
      // Handle both array and object-with-items response structures
      const items = Array.isArray(data) ? data : data.items ?? [];
      setContentList(items);
    } catch (err) {
      console.error("Content fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]); // Dependency array includes the stable fetchContent

  const filteredContent = useMemo(() => {
    return contentList.filter((item) => {
      // Ensure item.status exists
      if (!item.status) return false; 
      
      // 'all' shows everything
      if (filter === "all") return true; 
      
      // 'pending' filter should also include 'reported' items for action
      if (filter === "pending") {
        return item.status === "pending" || item.status === "reported";
      }

      // Default filter by exact status match
      return item.status === filter;
    });
  }, [contentList, filter]);

  const handleAction = async (id, action) => {
    // Only allow action on items that aren't already in the final state
    const currentItem = contentList.find(i => i.id === id);
    if (!currentItem || currentItem.status === action) return;

    try {
      let endpoint = "";
      switch (action) {
        case "approved":
        case "rejected":
        case "deleted":
          endpoint = `${config.endpoints.ratings}/${id}/${action}`;
          break;
        default:
          console.warn("Unknown action:", action);
          return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Action failed with status: ${res.status}`);
      }
      
      // Optimistic UI update
      setContentList((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: action } : item
        )
      );
    } catch (err) {
      console.error(`Moderation action (${action}) error:`, err);
      alert(`Failed to perform action (${action}). Check console for details.`);
    }
  };

  const statusOptions = ["all", "pending", "approved", "rejected", "reported"];
  
  // Calculate counts for filter buttons
  const getFilterCount = useCallback((s) => {
    return contentList.filter(
        (c) => c.status === s || (s === "pending" && c.status === "reported")
    ).length;
  }, [contentList]);

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        💬 Content Moderation & Reports
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-3 sm:space-y-0">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition duration-150 whitespace-nowrap ${
                s === filter
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({getFilterCount(s)})
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Displaying <strong>{filteredContent.length}</strong> items.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">
          Loading content list...
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center p-10 bg-gray-50 rounded-xl text-gray-500">
          🎉 No {filter} content to moderate. Great job!
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <div
              key={item.id}
              className={`${CARD_STYLES} flex flex-col sm:flex-row justify-between items-start sm:items-center`}
            >
              <div className="flex-grow min-w-0">
                <div className="flex items-center space-x-3 mb-2 flex-wrap">
                  <span className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {item.restaurantName ?? "Unknown Restaurant"}
                  </span>
                  <StatusTag status={item.status} />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 italic break-words line-clamp-2">
                  {/* Using item.content directly is safer than item.content.substring(0, 100) + "..." */}
                  “{item.content ?? "No content provided."}”
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  By: {item.author ?? "Anonymous"}
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                <button
                  onClick={() => handleAction(item.id, "approved")}
                  className="p-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 transition disabled:bg-gray-300"
                  title="Approve"
                  disabled={item.status === 'approved'}
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, "rejected")}
                  className="p-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:bg-gray-300"
                  title="Reject"
                  disabled={item.status === 'rejected'}
                >
                  <XCircle size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, "deleted")}
                  className="p-2 text-sm text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-300"
                  title="Delete/Remove"
                  disabled={item.status === 'deleted'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Admin Dashboard Component ---

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(TABS.ANALYTICS);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // CRITICAL: Authentication and Admin Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${config.endpoints.auth}/me`, {
          credentials: "include", // send HttpOnly cookie
        });
        
        if (!res.ok) throw new Error("Authentication check failed.");

        const data = await res.json();

        // Check for user existence and role
        if (!data.user || data.user.role !== "ADMIN") {
          // Not admin or not logged in → redirect
          navigate("/", { replace: true });
          return;
        }

      } catch (err) {
        console.error("Authorization error:", err);
        // Default redirect on any auth error
        navigate("/", { replace: true }); 
      } finally {
        setLoading(false); 
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center text-xl text-indigo-600">
              <p>Loading Admin Panel...</p>
          </div>
      );
  }
  
  return (
    <>
      <Header />
      {/* Added more semantic spacing */}
      <div className="pt-16 flex min-h-screen"> 
        {/* Sidebar */}
        <aside className="w-56 bg-white shadow-xl flex-shrink-0 border-r border-gray-100 p-4 hidden md:block">
          <nav className="space-y-2 pt-4"> 
            
            {/* Nav Item: Analytics */}
            <button
              onClick={() => setActiveTab(TABS.ANALYTICS)}
              className={`w-full flex items-center p-3 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === TABS.ANALYTICS
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <LayoutDashboard size={20} className="mr-3" />
              Analytics
            </button>
            
            {/* Nav Item: Moderation */}
            <button
              onClick={() => setActiveTab(TABS.MODERATION)}
              className={`w-full flex items-center p-3 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === TABS.MODERATION
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <MessageSquare size={20} className="mr-3" />
              Moderation
            </button>

          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow p-4 sm:p-6 md:p-10 overflow-x-hidden bg-gray-50">
          {activeTab === TABS.ANALYTICS && <DashboardAnalytics />}
          {activeTab === TABS.MODERATION && <ContentModeration />}
        </main>
      </div>
    </>
  );
}