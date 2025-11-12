import React, { useState, useEffect, useMemo } from "react";
import Header from './header';
import {
  LayoutDashboard,
  Users,
  ThumbsUp,
  CheckCircle,
  MessageSquare,
  Menu,
  X,
  BarChart,
  TrendingUp,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
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
import { useNavigate } from "react-router-dom";


// --- Configuration ---
const TABS = {
  ANALYTICS: "analytics",
  MODERATION: "moderation",
};

const CARD_STYLES =
  "bg-white p-4 sm:p-6 rounded-xl shadow-lg transition-all hover:shadow-xl border border-gray-100";
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  reported: "bg-red-100 text-red-800 border-red-300",
  deleted: "bg-gray-100 text-gray-800 border-gray-300",
};

// --- Utility Components ---
const MetricCard = ({ title, value, icon: Icon, color }) => (
  <div className={`${CARD_STYLES} flex items-center justify-between`}>
    <div className={`p-3 rounded-full ${color} text-white mr-4 shadow-lg`}>
      <Icon size={24} />
    </div>
    <div className="text-right flex-grow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
        {value?.toLocaleString?.() ?? "0"}
      </p>
    </div>
  </div>
);

const StatusTag = ({ status }) => (
  <span
    className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[status]}`}
  >
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

// --- Analytics Tab Components ---
// CHANGE: Update prop from 'data' to 'overviewData' and add 'engagementData'
const OverviewStats = ({ overviewData, engagementData }) => { 
  const data = overviewData; // Keep 'data' alias for internal consistency
  const engagement = engagementData || {}; // Guard against null

  const ratingData = useMemo(() => {
    const r = data?.ratings || { approved: 0, pending: 0, rejected: 0 };
    return [
      { name: "Approved", value: r.approved, color: "#10B981" },
      { name: "Pending", value: r.pending, color: "#F59E0B" },
      { name: "Rejected", value: r.rejected, color: "#EF4444" },
    ];
  }, [data]);

  return (
    // CHANGE: Added two more MetricCards for engagement data, changing the grid layout
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6"> 
      {/* Existing Overview Metrics */}
      <MetricCard
        title="Rooms Created"
        value={data?.roomsCreated ?? 0}
        icon={Users}
        color="bg-indigo-500"
      />
      <MetricCard
        title="Total Votes"
        value={data?.votes ?? 0}
        icon={ThumbsUp}
        color="bg-purple-500"
      />
      <MetricCard
        title="Decisions Made"
        value={data?.decisions ?? 0}
        icon={CheckCircle}
        color="bg-cyan-500"
      />

      {/* NEW Engagement Metrics */}
      <MetricCard
        title="Avg Participants/Room"
        value={engagement.avgParticipantsPerRoom?.toFixed(1)} // Format to one decimal
        icon={Users}
        color="bg-teal-500"
      />
      <MetricCard
        title="Avg Votes/Room"
        value={engagement.avgVotesPerRoom?.toFixed(1)} // Format to one decimal
        icon={ThumbsUp}
        color="bg-pink-500"
      />

      {/* Original Pie Chart */}
      <div className={`${CARD_STYLES}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Rating Status
        </h3>
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

const TimeSeriesChart = ({ data }) => (
  <div className={`${CARD_STYLES} mt-6`}>
    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
      <BarChart size={20} className="mr-2 text-indigo-500" /> Activity Trend
      (Last 7 Days)
    </h3>
    <div className="h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={Array.isArray(data) ? data : []}
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
            stroke="#4F46E5"
            strokeWidth={2}
            name="Rooms Created"
          />
          <Line
            type="monotone"
            dataKey="votes"
            stroke="#8B5CF6"
            strokeWidth={2}
            name="Total Votes"
          />
          <Line
            type="monotone"
            dataKey="decisions"
            stroke="#06B6D4"
            strokeWidth={2}
            name="Decisions"
          />
          <Line
            type="monotone"
            dataKey="ratings"
            stroke="#10B981"
            strokeWidth={2}
            name="New Ratings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

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
                  key={rest.id || index}
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
                    {item.avgScore?.toFixed?.(1) ?? "0.0"}
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

// --- Dashboard Analytics Component ---
const DashboardAnalytics = () => {
  const [data, setData] = useState({
    overview: null,
    timeseries: [],
    topRestaurants: [],
    engagement: null, // ADDED: Initialize engagement state
    loading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        // FIX 1: Corrected variable assignment to match Promise.all order
        const [engagementRes, overviewRes, timeseriesRes, topRes] = await Promise.all([
          fetch(`${config.endpoints.analytics}/engagement`, { credentials: "include" }),
          fetch(`${config.endpoints.analytics}/overview`, { credentials: "include" }),
          fetch(`${config.endpoints.analytics}/timeseries`, { credentials: "include" }),
          fetch(`${config.endpoints.analytics}/top-restaurants`, { credentials: "include" }),
        ]);

        let overview = null;
        let timeseries = [];
        let topResData = { items: [] };
        let engagement = null; // Local variable to hold parsed data

        try {
          if (engagementRes.ok) engagement = await engagementRes.json();
        } catch (e) {
          console.warn('Failed to parse engagement JSON', e);
        }
        try {
          if (overviewRes.ok) {
            const rawData = await overviewRes.json();
            overview = rawData.totals;
          }
        } catch (e) {
          console.warn('Failed to parse overview JSON', e);
        }
        
        try {
          if (timeseriesRes.ok) {
            const rawData = await timeseriesRes.json();
            timeseries = Array.isArray(rawData) ? rawData : []; 
          }
        } catch (e) {
          console.warn('Failed to parse timeseries JSON', e);
        }

        try {
          if (topRes.ok) topResData = await topRes.json();
        } catch (e) {
          console.warn('Failed to parse top-restaurants JSON', e);
        }

        // FIX 2: Correctly setting the engagement state property
        setData({
          overview,
          timeseries: Array.isArray(timeseries) ? timeseries : [],
          topRestaurants: Array.isArray(topResData.items) ? topResData.items : [],
          engagement, // Now uses the local 'engagement' variable
          loading: false,
        });
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    })();
  }, []);


  if (data.loading)
    return (
      <div className="text-center py-10 text-gray-500">Loading Analytics...</div>
    );

  if (!data.overview)
    return (
      <div className="text-center py-10 text-red-500">
        Failed to load analytics data.
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        System Analytics & Health
      </h2>
      {/* Correct props for OverviewStats */}
      <OverviewStats overviewData={data.overview} engagementData={data.engagement} />
      <TimeSeriesChart data={data.timeseries} />
      <TopRestaurantsTable data={data.topRestaurants} />
    </div>
  );
};
const ContentModeration = () => {
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${config.endpoints.content}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch content");
        const data = await res.json();
        setContentList(Array.isArray(data) ? data : data.items ?? []);
      } catch (err) {
        console.error("Content fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredContent = contentList.filter((item) => {
    if (!item.status) return false;
    if (filter === "all") return true;
    return item.status === filter || (filter === "pending" && item.status === "reported");
  });

  const handleAction = async (id, action) => {
    try {
      let endpoint = "";
      switch (action) {
        case "approved":
          endpoint = `${config.endpoints.ratings}/${id}/approve`;
          break;
        case "rejected":
          endpoint = `${config.endpoints.ratings}/${id}/reject`;
          break;
        case "deleted":
          endpoint = `${config.endpoints.ratings}/${id}/delete`;
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

      const data = await res.json();
      if (!data.ok) throw new Error("Action failed");

      setContentList((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: action } : item
        )
      );
    } catch (err) {
      console.error("Action error:", err);
      alert("Failed to perform action. Check console for details.");
    }
  };

  const statusOptions = ["all", "pending", "approved", "rejected", "reported"];

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        Content Moderation & Reports
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
              {s.charAt(0).toUpperCase() + s.slice(1)} (
              {contentList.filter(
                (c) => c.status === s || (s === "pending" && c.status === "reported")
              ).length}
              )
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
          No {filter} content to moderate. Great job!
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
                    {item.restaurant ?? "Unknown Restaurant"}
                  </span>
                  <StatusTag status={item.status} />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 italic break-words">
                  “{item.content?.length > 100
                    ? item.content.substring(0, 100) + "..."
                    : item.content ?? ""}”
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  By: {item.author ?? "Anonymous"}
                </p>
              </div>
              <div className="flex space-x-2 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                <button
                  onClick={() => handleAction(item.id, "approved")}
                  className="p-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 transition"
                  title="Approve"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, "rejected")}
                  className="p-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
                  title="Reject"
                >
                  <XCircle size={18} />
                </button>
                <button
                  onClick={() => handleAction(item.id, "deleted")}
                  className="p-2 text-sm text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition"
                  title="Delete/Remove"
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


// --- Main ---
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(TABS.ANALYTICS); // Use TABS constant
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 💥 RE-ADDED: CRITICAL useEffect for loading/authentication check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${config.endpoints.auth}/me`, {
          credentials: "include", // send HttpOnly cookie
        });
        const data = await res.json();

        if (!data.user || data.user.role !== "ADMIN") {
          // Not admin → redirect to home or login
          navigate("/", { replace: true });
          return;
        }

      } catch (err) {
        console.error("Failed to fetch user:", err);
        // If fetch fails (e.g., server offline), still redirect
        navigate("/", { replace: true }); 
      } finally {
        setLoading(false); // This ensures the component renders after the check!
      }
    })();
  }, [navigate]);

  if (loading) return <p>Loading...</p>;
  
  // NOTE: If TABS is still undefined, you may need to define it 
  // explicitly inside this file if it's not being exported/imported properly.

  return (
    <>
      <Header />
      <br/>
      <br/>
      <div className="flex min-h-[calc(100vh-60px)]">
        {/* Sidebar */}
        <aside className="w-56 bg-white shadow-xl flex-shrink-0 border-r border-gray-100 p-4 hidden md:block">
          <nav className="space-y-2">
            
            {/* Nav Item: Analytics */}
            <button
              onClick={() => setActiveTab(TABS.ANALYTICS)}
              className={`w-full flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === TABS.ANALYTICS
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <LayoutDashboard size={20} className="mr-3" />
              Analytics
            </button>
            
            {/* Nav Item: Moderation */}
            <button
              onClick={() => setActiveTab(TABS.MODERATION)}
              className={`w-full flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === TABS.MODERATION
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MessageSquare size={20} className="mr-3" />
              Moderation
            </button>

          </nav>
        </aside>

        {/* Main Area */}
        <main className="flex-grow p-4 sm:p-6 md:p-10 overflow-y-auto">
          {activeTab === TABS.ANALYTICS && <DashboardAnalytics />}
          {activeTab === TABS.MODERATION && <ContentModeration />}
        </main>
      </div>
    </>
  );
}