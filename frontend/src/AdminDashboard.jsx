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

// Theme colors matching Ratings page style
const THEME_COLORS = {
  background: "#FCEEE3",
  card: "#FFF7EF",
  border: "#C47B4E",
  accent: "#BB3D25",
  textPrimary: "#4A1F0C",
  textSecondary: "#7A4B31",
  accentDark: "#C0471C",
};

// Card style matching Ratings page (rounded, soft shadow)
const CARD_STYLES = {
  background: THEME_COLORS.card,
  borderRadius: "26px",
  border: `2px solid ${THEME_COLORS.border}`,
  boxShadow: "0 20px 45px rgba(68,29,8,.1)",
  padding: "1.5rem",
  transition: "all 0.3s ease",
};

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
 * Renders a key performance metric card with Ratings page style.
 */
const MetricCard = ({ title, value, icon: Icon, color }) => (
  <div
    className="flex flex-col items-center text-center"
    style={{
      ...CARD_STYLES,
      padding: "2rem 1.5rem",
    }}
  >
    <div
      className="p-4 mb-4 text-white"
      style={{
        backgroundColor: color || THEME_COLORS.accent,
        borderRadius: "18px",
        boxShadow: "0 12px 25px rgba(187,61,37,.25)",
      }}
    >
      <Icon size={32} />
    </div>
    <p
      className="text-4xl sm:text-5xl font-bold mb-2"
      style={{ color: THEME_COLORS.textPrimary }}
    >
      {value?.toLocaleString?.() ?? "0"}
    </p>
    <p
      className="text-sm font-semibold"
      style={{ color: THEME_COLORS.textSecondary }}
    >
      {title}
    </p>
  </div>
);

/**
 * Renders a stylized status tag.
 */
const StatusTag = ({ status }) => {
  // Guard against null/undefined status
  const safeStatus = status || "deleted";
  const displayStatus =
    safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);

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
 * Displays core overview metrics.
 */
const OverviewStats = ({ overviewData, engagementData }) => {
  const engagement = engagementData || {};
  const data = useMemo(() => overviewData || {}, [overviewData]);

  return (
    <section
      className="mb-10"
      style={{
        ...CARD_STYLES,
        padding: "2.5rem",
        marginBottom: "2rem",
      }}
    >
      <div className="mb-8">
        <h3
          className="text-2xl font-bold mb-2"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          📈 Overview Metrics
        </h3>
        <p className="text-sm" style={{ color: THEME_COLORS.textSecondary }}>
          Key performance indicators and system statistics
        </p>
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
        style={{ marginTop: "1.5rem" }}
      >
        {/* System Metrics */}
        <MetricCard
          title="Rooms Created"
          value={data.roomsCreated ?? 0}
          icon={Users}
          color="#10B981"
        />
        <MetricCard
          title="Total Votes"
          value={data.votes ?? 0}
          icon={ThumbsUp}
          color="#F59E0B"
        />
        <MetricCard
          title="Decisions Made"
          value={data.decisions ?? 0}
          icon={CheckCircle}
          color="#3B82F6"
        />

        {/* Engagement Metrics */}
        <MetricCard
          title="Avg Participants/Room"
          value={engagement.avgParticipantsPerRoom?.toFixed(1)}
          icon={Users}
          color="#10B981"
        />
        <MetricCard
          title="Avg Votes/Room"
          value={engagement.avgVotesPerRoom?.toFixed(1)}
          icon={ThumbsUp}
          color="#F59E0B"
        />
      </div>
    </section>
  );
};

/**
 * Rating Status section with pie chart and detailed rating list with modal.
 */
const RatingStatusSection = ({ overviewData, ratingsList }) => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(3);

  const data = useMemo(() => overviewData || {}, [overviewData]);

  const ratingData = useMemo(() => {
    const r = data.ratings || { approved: 0, pending: 0, rejected: 0 };
    return [
      { name: "Approved", value: r.approved, color: "#10B981" },
      { name: "Pending", value: r.pending, color: "#F59E0B" },
      { name: "Rejected", value: r.rejected, color: "#EF4444" },
    ];
  }, [data]);

  const ratings = Array.isArray(ratingsList) ? ratingsList : [];
  const displayedRatings = ratings.slice(0, displayCount);
  const hasMore = ratings.length > displayCount;

  const handleViewReview = (rating) => {
    setSelectedRating(rating);
    setShowModal(true);
  };

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + 3, ratings.length));
  };

  return (
    <section
      className="mb-10"
      style={{
        ...CARD_STYLES,
        padding: "2.5rem",
        marginBottom: "2rem",
      }}
    >
      <div className="mb-8">
        <h3
          className="text-2xl font-bold mb-2"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          ⭐ Rating Status & Reviews
        </h3>
        <p className="text-sm" style={{ color: THEME_COLORS.textSecondary }}>
          Monitor review submissions and moderation status
        </p>
      </div>
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        style={{ marginTop: "1.5rem" }}
      >
        {/* Pie Chart */}
        <div className="flex flex-col lg:col-span-1" style={CARD_STYLES}>
          <h4
            className="text-lg font-semibold mb-5"
            style={{ color: THEME_COLORS.textPrimary }}
          >
            Status Distribution
          </h4>
          <div
            style={{
              width: "100%",
              height: "250px",
              minHeight: "250px",
              marginTop: "0.5rem",
              minWidth: 0,
              position: "relative",
              display: "block",
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={250}
            >
              <PieChart>
                <Pie
                  data={ratingData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {ratingData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating List - Compact View */}
        <div className="lg:col-span-2" style={CARD_STYLES}>
          <div className="flex items-center justify-between mb-6">
            <h4
              className="text-lg font-semibold"
              style={{ color: THEME_COLORS.textPrimary }}
            >
              Recent Reviews
            </h4>
            <span
              className="text-sm px-3 py-1"
              style={{
                backgroundColor: THEME_COLORS.background,
                color: THEME_COLORS.textSecondary,
                borderRadius: "999px",
                border: `1px solid ${THEME_COLORS.border}`,
              }}
            >
              {ratings.length} total
            </span>
          </div>
          <div className="space-y-4" style={{ paddingTop: "0.5rem" }}>
            {ratings.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: THEME_COLORS.textSecondary }}>
                  No ratings available
                </p>
              </div>
            ) : (
              <>
                {displayedRatings.map((rating) => (
                  <div
                    key={rating.id}
                    onClick={() => handleViewReview(rating)}
                    className="cursor-pointer transition-all"
                    style={{
                      backgroundColor: THEME_COLORS.background,
                      border: `2px solid ${THEME_COLORS.border}`,
                      borderRadius: "18px",
                      padding: "1.2rem",
                      boxShadow: "0 8px 20px rgba(68,29,8,.08)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 12px 30px rgba(68,29,8,.15)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 8px 20px rgba(68,29,8,.08)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="font-bold text-base truncate"
                            style={{ color: THEME_COLORS.textPrimary }}
                          >
                            {rating.restaurant?.name || "Unknown Restaurant"}
                          </span>
                          <StatusTag status={rating.status} />
                          <span
                            className="text-sm font-medium whitespace-nowrap"
                            style={{ color: THEME_COLORS.textSecondary }}
                          >
                            ⭐ {rating.score?.toFixed(1) || "N/A"}
                          </span>
                        </div>
                        <p
                          className="text-sm truncate italic mb-2"
                          style={{ color: THEME_COLORS.textSecondary }}
                        >
                          "{rating.comment || "No comment"}"
                        </p>
                        <div
                          className="flex items-center gap-2 text-xs"
                          style={{ color: THEME_COLORS.textSecondary }}
                        >
                          <span>
                            By: {rating.user?.username || "Anonymous"}
                          </span>
                          {rating.createdAt && (
                            <span>
                              •{" "}
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="px-4 py-2 text-sm font-semibold text-white transition flex-shrink-0"
                        style={{
                          backgroundColor: THEME_COLORS.accent,
                          borderRadius: "14px",
                          boxShadow: "0 8px 20px rgba(187,61,37,.25)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReview(rating);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div className="text-center pt-2">
                    <button
                      onClick={handleLoadMore}
                      className="px-6 py-2 text-sm font-semibold text-white transition"
                      style={{
                        backgroundColor: THEME_COLORS.accent,
                        borderRadius: "14px",
                        boxShadow: "0 8px 20px rgba(187,61,37,.25)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      Load More ({ratings.length - displayCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Review Detail Modal - RatingModal style */}
      {showModal && selectedRating && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 9999,
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            overflow: "auto",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "600px", margin: "2rem auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-content"
              style={{
                backgroundColor: THEME_COLORS.card,
                color: THEME_COLORS.textPrimary,
                border: `2px solid ${THEME_COLORS.border}`,
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 25px 45px rgba(74,31,12,0.25)",
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="btn-close position-absolute"
                style={{
                  top: "20px",
                  right: "20px",
                  zIndex: 10000,
                  fontSize: "1.5rem",
                  opacity: 0.8,
                  backgroundColor: "rgba(0,0,0,0.1)",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                }}
                aria-label="Close"
              >
                <span
                  style={{
                    fontSize: "1.5rem",
                    lineHeight: "1",
                    color: THEME_COLORS.textPrimary,
                  }}
                >
                  ×
                </span>
              </button>

              {/* Modal Body */}
              <div
                className="p-4"
                style={{ backgroundColor: THEME_COLORS.card }}
              >
                {/* Restaurant Info Header */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                    <div>
                      <h3
                        className="mb-1"
                        style={{
                          color: THEME_COLORS.textPrimary,
                          fontSize: "1.75rem",
                        }}
                      >
                        {selectedRating.restaurant?.name ||
                          "Unknown Restaurant"}
                      </h3>
                      {selectedRating.restaurant?.address && (
                        <p
                          className="small mb-0"
                          style={{ color: THEME_COLORS.textSecondary }}
                        >
                          📍 {selectedRating.restaurant.address}
                        </p>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <StatusTag status={selectedRating.status} />
                      <div className="d-flex align-items-center gap-1">
                        <span style={{ fontSize: "1.5rem" }}>⭐</span>
                        <span
                          style={{
                            color: THEME_COLORS.textPrimary,
                            fontSize: "1.25rem",
                            fontWeight: "bold",
                          }}
                        >
                          {selectedRating.score?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <hr style={{ borderColor: "#E7C2A3", margin: "1rem 0" }} />
                </div>

                {/* Review Comment */}
                <div className="mb-4">
                  <h5
                    className="mb-2 fw-bold"
                    style={{ color: THEME_COLORS.textPrimary }}
                  >
                    Review Comment
                  </h5>
                  <div
                    className="p-3 rounded"
                    style={{
                      backgroundColor: THEME_COLORS.background,
                      border: `2px solid ${THEME_COLORS.border}`,
                      borderRadius: "12px",
                    }}
                  >
                    <p
                      className="mb-0"
                      style={{
                        color: THEME_COLORS.textPrimary,
                        fontStyle: "italic",
                      }}
                    >
                      {selectedRating.comment || "No comment provided"}
                    </p>
                  </div>
                </div>

                {/* Reviewer Info */}
                <div className="row mb-4">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <h6
                      className="small text-uppercase mb-2"
                      style={{
                        color: THEME_COLORS.textSecondary,
                        opacity: 0.8,
                      }}
                    >
                      Reviewer
                    </h6>
                    <p
                      className="mb-0 fw-semibold"
                      style={{ color: THEME_COLORS.textPrimary }}
                    >
                      {selectedRating.user?.username || "Anonymous"}
                    </p>
                  </div>
                  {selectedRating.createdAt && (
                    <div className="col-md-6">
                      <h6
                        className="small text-uppercase mb-2"
                        style={{
                          color: THEME_COLORS.textSecondary,
                          opacity: 0.8,
                        }}
                      >
                        Date Submitted
                      </h6>
                      <p
                        className="mb-0 fw-semibold"
                        style={{ color: THEME_COLORS.textPrimary }}
                      >
                        {new Date(selectedRating.createdAt).toLocaleString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedRating.tags && selectedRating.tags.length > 0 && (
                  <div className="mb-3">
                    <h6
                      className="small text-uppercase mb-2"
                      style={{
                        color: THEME_COLORS.textSecondary,
                        opacity: 0.8,
                      }}
                    >
                      Tags
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {selectedRating.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-pill text-white small fw-semibold"
                          style={{
                            backgroundColor: THEME_COLORS.accent,
                            boxShadow: "0 4px 12px rgba(187,61,37,.2)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button Footer */}
                <div
                  className="d-flex justify-content-end mt-4 pt-3"
                  style={{ borderTop: `1px solid ${THEME_COLORS.border}` }}
                >
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn px-4 py-2 fw-semibold text-white"
                    style={{
                      backgroundColor: THEME_COLORS.accent,
                      borderColor: THEME_COLORS.accent,
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(187,61,37,.25)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/**
 * Displays system activity trends over time.
 */
const TimeSeriesChart = ({ data }) => {
  // Transform data to match expected format
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      // If data is an object with separate arrays, combine them
      if (data && typeof data === "object") {
        const dates = new Set();
        if (data.rooms) data.rooms.forEach((d) => dates.add(d.date));
        if (data.votes) data.votes.forEach((d) => dates.add(d.date));
        if (data.decisions) data.decisions.forEach((d) => dates.add(d.date));
        if (data.ratings) data.ratings.forEach((d) => dates.add(d.date));

        return Array.from(dates)
          .sort()
          .map((date) => ({
            date: new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            rooms: data.rooms?.find((d) => d.date === date)?.value || 0,
            votes: data.votes?.find((d) => d.date === date)?.value || 0,
            decisions: data.decisions?.find((d) => d.date === date)?.value || 0,
            ratings: data.ratings?.find((d) => d.date === date)?.value || 0,
          }));
      }
      return [];
    }
    return data;
  }, [data]);

  return (
    <div>
      <h3
        className="text-xl font-semibold mb-4 flex items-center"
        style={{ color: THEME_COLORS.textPrimary }}
      >
        <BarChart
          size={20}
          className="mr-2"
          style={{ color: THEME_COLORS.accent }}
        />
        Activity Trend (Last 7 Days)
      </h3>
      {chartData.length === 0 ? (
        <div
          className="text-center py-12"
          style={{ color: THEME_COLORS.textSecondary }}
        >
          <p>No activity data available</p>
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "400px",
            minHeight: "400px",
            minWidth: 0,
            position: "relative",
            display: "block",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={400}
          >
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={THEME_COLORS.border}
                opacity={0.3}
              />
              <XAxis dataKey="date" stroke={THEME_COLORS.textSecondary} />
              <YAxis stroke={THEME_COLORS.textSecondary} />
              <Tooltip
                contentStyle={{
                  backgroundColor: THEME_COLORS.card,
                  border: `2px solid ${THEME_COLORS.border}`,
                  borderRadius: "14px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rooms"
                stroke={THEME_COLORS.accent}
                strokeWidth={3}
                name="Rooms Created"
                dot={{ fill: THEME_COLORS.accent, r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="votes"
                stroke={THEME_COLORS.accentDark}
                strokeWidth={3}
                name="Total Votes"
                dot={{ fill: THEME_COLORS.accentDark, r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="decisions"
                stroke={THEME_COLORS.border}
                strokeWidth={3}
                name="Decisions"
                dot={{ fill: THEME_COLORS.border, r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="ratings"
                stroke="#10B981"
                strokeWidth={3}
                name="New Ratings"
                dot={{ fill: "#10B981", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/**
 * Displays a table of top-performing restaurants.
 */
const TopRestaurantsTable = ({ data }) => {
  const restaurants = Array.isArray(data) ? data : [];

  return (
    <div style={{ width: "100%" }}>
      <h3
        className="text-xl font-semibold mb-4 flex items-center"
        style={{ color: THEME_COLORS.textPrimary }}
      >
        <TrendingUp
          size={20}
          className="mr-2"
          style={{ color: THEME_COLORS.accent }}
        />
        Top Performing Restaurants (by Wins)
      </h3>
      <div className="overflow-x-auto" style={{ width: "100%" }}>
        <table
          className="w-full"
          style={{ tableLayout: "auto", width: "100%" }}
        >
          <thead>
            <tr style={{ borderBottom: `2px solid ${THEME_COLORS.border}` }}>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: THEME_COLORS.textPrimary, width: "25%" }}
              >
                Restaurant
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
                style={{ color: THEME_COLORS.textPrimary, width: "50%" }}
              >
                Address
              </th>
              <th
                className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: THEME_COLORS.textPrimary, width: "12.5%" }}
              >
                Wins
              </th>
              <th
                className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: THEME_COLORS.textPrimary, width: "12.5%" }}
              >
                Avg. Score
              </th>
            </tr>
          </thead>
          <tbody>
            {restaurants.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-8 text-center"
                  style={{ color: THEME_COLORS.textSecondary }}
                >
                  No restaurant data available
                </td>
              </tr>
            ) : (
              restaurants.map((item, index) => {
                const rest = item.restaurant || {};
                return (
                  <tr
                    key={rest.id || index}
                    style={{
                      borderBottom: `1px solid ${THEME_COLORS.border}`,
                      backgroundColor:
                        index % 2 === 0
                          ? THEME_COLORS.card
                          : THEME_COLORS.background,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        THEME_COLORS.background;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        index % 2 === 0
                          ? THEME_COLORS.card
                          : THEME_COLORS.background;
                    }}
                  >
                    <td
                      className="px-6 py-4 text-sm font-semibold"
                      style={{
                        color: THEME_COLORS.textPrimary,
                        wordBreak: "break-word",
                      }}
                    >
                      {rest.name || "N/A"}
                    </td>
                    <td
                      className="px-6 py-4 text-sm hidden sm:table-cell"
                      style={{
                        color: THEME_COLORS.textSecondary,
                        wordBreak: "break-word",
                      }}
                    >
                      {rest.address || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-white"
                        style={{
                          backgroundColor: THEME_COLORS.accent,
                          borderRadius: "999px",
                          boxShadow: "0 4px 12px rgba(187,61,37,.2)",
                        }}
                      >
                        {item.wins ?? 0}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-right font-medium"
                      style={{ color: THEME_COLORS.textPrimary }}
                    >
                      {item.avgScore?.toFixed(1) ?? "0.0"}
                    </td>
                  </tr>
                );
              })
            )}
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
    ratingsList: [],
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
          `${config.endpoints.content}`, // Fetch ratings for review list
        ];

        const fetchOptions = { credentials: "include" };

        const [engagementRes, overviewRes, timeseriesRes, topRes, ratingsRes] =
          await Promise.all(endpoints.map((url) => fetch(url, fetchOptions)));

        let overview = null;
        let timeseries = [];
        let topRestaurants = [];
        let engagement = null;
        let ratingsList = [];

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

        engagement = await parseJson(engagementRes, "engagement");

        const overviewRaw = await parseJson(overviewRes, "overview");
        overview = overviewRaw?.totals || null;

        const timeseriesRaw = await parseJson(timeseriesRes, "timeseries");
        // Handle both array and object format
        if (Array.isArray(timeseriesRaw)) {
          timeseries = timeseriesRaw;
        } else if (timeseriesRaw && typeof timeseriesRaw === "object") {
          // If it's an object with rooms, votes, decisions, ratings arrays
          timeseries = timeseriesRaw;
        } else {
          timeseries = [];
        }

        const topResRaw = await parseJson(topRes, "top-restaurants");
        topRestaurants = Array.isArray(topResRaw?.items) ? topResRaw.items : [];

        // Parse ratings list
        const ratingsRaw = await parseJson(ratingsRes, "ratings");
        if (Array.isArray(ratingsRaw)) {
          ratingsList = ratingsRaw;
        } else if (ratingsRaw?.items && Array.isArray(ratingsRaw.items)) {
          ratingsList = ratingsRaw.items;
        }

        setData({
          overview,
          timeseries,
          topRestaurants,
          engagement,
          ratingsList: ratingsList.slice(0, 20), // Show latest 20 ratings
          loading: false,
        });
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchAnalyticsData();
  }, []);

  if (data.loading)
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-lg text-gray-600 font-medium">
          Loading System Analytics...
        </p>
      </div>
    );

  if (!data.overview)
    return (
      <div className="text-center py-10 bg-red-50 rounded-xl border border-red-200 m-4">
        <p className="font-medium text-red-600">
          ⚠️ Error: Failed to load core analytics data. Please check the backend
          service.
        </p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ color: THEME_COLORS.textPrimary }}
        >
          📊 System Analytics & Health
        </h2>
        <p style={{ color: THEME_COLORS.textSecondary }}>
          Monitor your platform's performance and engagement metrics
        </p>
      </div>

      {/* Part 1: Overview Metrics */}
      <OverviewStats
        overviewData={data.overview}
        engagementData={data.engagement}
      />

      {/* Part 2: Rating Status & Reviews */}
      <RatingStatusSection
        overviewData={data.overview}
        ratingsList={data.ratingsList}
      />

      {/* Part 3: Activity Trend */}
      <section
        className="mb-10"
        style={{
          ...CARD_STYLES,
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div className="mb-6">
          <h3
            className="text-2xl font-bold mb-2"
            style={{ color: THEME_COLORS.textPrimary }}
          >
            📈 Activity Trends
          </h3>
          <p className="text-sm" style={{ color: THEME_COLORS.textSecondary }}>
            Track system activity over the last 7 days
          </p>
        </div>
        <div
          style={{
            padding: "1rem",
            backgroundColor: THEME_COLORS.background,
            borderRadius: "18px",
          }}
        >
          <TimeSeriesChart data={data.timeseries} />
        </div>
      </section>

      {/* Part 4: Top Restaurants */}
      <section
        className="mb-10"
        style={{
          ...CARD_STYLES,
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div className="mb-6">
          <h3
            className="text-2xl font-bold mb-2"
            style={{ color: THEME_COLORS.textPrimary }}
          >
            🏆 Top Performing Restaurants
          </h3>
          <p className="text-sm" style={{ color: THEME_COLORS.textSecondary }}>
            Restaurants with the most wins
          </p>
        </div>
        <div
          style={{
            padding: "1rem",
            backgroundColor: THEME_COLORS.background,
            borderRadius: "18px",
          }}
        >
          <TopRestaurantsTable data={data.topRestaurants} />
        </div>
      </section>
    </div>
  );
};

// --- Content Moderation Component ---

const ContentModeration = () => {
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  // Fetch content from backend
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.endpoints.content}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch content");
      const data = await res.json();
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
  }, [fetchContent]);

  // Filter content based on selected filter
  const filteredContent = useMemo(() => {
    return contentList.filter((item) => {
      if (!item.status) return false;
      if (filter === "all") return true;
      if (filter === "pending") return item.status === "pending" || item.status === "reported";
      return item.status === filter;
    });
  }, [contentList, filter]);

  // Handle approve, reject, delete actions
  const handleAction = async (id, action) => {
    const currentItem = contentList.find((i) => i.id === id);
    if (!currentItem || currentItem.status === action) return;

    try {
      let endpoint = "";
      let method = "POST";

      switch (action) {
        case "approved":
          endpoint = `${config.endpoints.ratings}/${id}/approved`;
          break;
        case "rejected":
          endpoint = `${config.endpoints.ratings}/${id}/rejected`;
          break;
        case "deleted":
          endpoint = `${config.endpoints.ratings}/${id}/deleted`;
          method = "DELETE";
          break;
        default:
          console.warn("Unknown action:", action);
          return;
      }

      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: method !== "DELETE" ? { "Content-Type": "application/json" } : undefined,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Action failed with status ${res.status}`);
      }

      // Optimistic UI update
      setContentList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: action } : item))
      );
    } catch (err) {
      console.error(`Moderation action (${action}) error:`, err);
      alert(`Failed to perform action (${action}). Check console for details.`);
    }
  };

  const statusOptions = ["all", "pending", "approved", "rejected", "reported"];

  const getFilterCount = useCallback(
    (s) => {
      return contentList.filter(
        (c) => c.status === s || (s === "pending" && c.status === "reported")
      ).length;
    },
    [contentList]
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: THEME_COLORS.textPrimary }}>
          💬 Content Moderation & Reports
        </h2>
        <p style={{ color: THEME_COLORS.textSecondary }}>
          Review and manage user-generated content
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6" style={{ ...CARD_STYLES, padding: "1.5rem" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="px-4 py-2 text-sm font-semibold transition whitespace-nowrap"
                style={{
                  backgroundColor: s === filter ? THEME_COLORS.accent : THEME_COLORS.background,
                  color: s === filter ? "white" : THEME_COLORS.textPrimary,
                  border: `2px solid ${s === filter ? THEME_COLORS.accent : THEME_COLORS.border}`,
                  borderRadius: "14px",
                  boxShadow: s === filter ? "0 8px 20px rgba(187,61,37,.25)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (s !== filter) e.currentTarget.style.backgroundColor = THEME_COLORS.card;
                }}
                onMouseLeave={(e) => {
                  if (s !== filter) e.currentTarget.style.backgroundColor = THEME_COLORS.background;
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({getFilterCount(s)})
              </button>
            ))}
          </div>
          <p className="text-sm" style={{ color: THEME_COLORS.textSecondary }}>
            Displaying <strong style={{ color: THEME_COLORS.textPrimary }}>{filteredContent.length}</strong> items.
          </p>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="text-center py-20" style={{ ...CARD_STYLES, padding: "3rem" }}>
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: THEME_COLORS.accent }}></div>
          <p style={{ color: THEME_COLORS.textSecondary }}>Loading content list...</p>
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center p-12" style={{ ...CARD_STYLES, padding: "3rem", backgroundColor: THEME_COLORS.card }}>
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-xl font-bold mb-2" style={{ color: THEME_COLORS.textPrimary }}>All clear!</p>
          <p style={{ color: THEME_COLORS.textSecondary }}>No {filter} content to moderate. Great job!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center"
              style={{ ...CARD_STYLES, padding: "1.5rem", gap: "1rem" }}
            >
              <div className="flex-grow min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-base sm:text-lg font-bold" style={{ color: THEME_COLORS.textPrimary }}>
                    {item.restaurantName ?? "Unknown Restaurant"}
                  </span>
                  <StatusTag status={item.status} />
                </div>
                <div className="mb-2 p-3 rounded-lg" style={{ backgroundColor: THEME_COLORS.background, border: `1px solid ${THEME_COLORS.border}`, borderRadius: "12px" }}>
                  <p className="text-sm italic break-words" style={{ color: THEME_COLORS.textSecondary }}>
                    "{item.content ?? "No content provided."}"
                  </p>
                </div>
                <p className="text-xs" style={{ color: THEME_COLORS.textSecondary, opacity: 0.8 }}>
                  By: {item.author ?? "Anonymous"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-shrink-0 mt-3 sm:mt-0">
                {/* Approve */}
                <button
                  onClick={() => handleAction(item.id, "approved")}
                  className="p-3 transition"
                  style={{
                    backgroundColor: item.status === "approved" ? "#9CA3AF" : "#10B981",
                    borderRadius: "14px",
                    boxShadow: item.status === "approved" ? "none" : "0 4px 12px rgba(16,185,129,.25)",
                    color: "white",
                    cursor: item.status === "approved" ? "not-allowed" : "pointer",
                    opacity: item.status === "approved" ? 0.6 : 1,
                  }}
                  disabled={item.status === "approved"}
                  title="Approve"
                >
                  <CheckCircle size={20} />
                </button>

                {/* Reject */}
                <button
                  onClick={() => handleAction(item.id, "rejected")}
                  className="p-3 transition"
                  style={{
                    backgroundColor: item.status === "rejected" ? "#9CA3AF" : "#EF4444",
                    borderRadius: "14px",
                    boxShadow: item.status === "rejected" ? "none" : "0 4px 12px rgba(239,68,68,.25)",
                    color: "white",
                    cursor: item.status === "rejected" ? "not-allowed" : "pointer",
                    opacity: item.status === "rejected" ? 0.6 : 1,
                  }}
                  disabled={item.status === "rejected"}
                  title="Reject"
                >
                  <XCircle size={20} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleAction(item.id, "deleted")}
                  className="p-3 transition"
                  style={{
                    backgroundColor: item.status === "deleted" ? "#9CA3AF" : "#6B7280",
                    borderRadius: "14px",
                    boxShadow: item.status === "deleted" ? "none" : "0 4px 12px rgba(107,114,128,.25)",
                    color: "white",
                    cursor: item.status === "deleted" ? "not-allowed" : "pointer",
                    opacity: item.status === "deleted" ? 0.6 : 1,
                  }}
                  disabled={item.status === "deleted"}
                  title="Delete/Remove"
                >
                  <Trash2 size={20} />
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
      <div className="pt-20 flex min-h-screen">
        {/* Sidebar */}
        <aside
          className="w-64 flex-shrink-0 p-6 hidden md:block"
          style={{
            backgroundColor: THEME_COLORS.card,
            borderRight: `2px solid ${THEME_COLORS.border}`,
            boxShadow: "4px 0 20px rgba(68,29,8,.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="mb-8 w-full">
            <h3
              className="text-xl font-bold mb-1 text-center"
              style={{ color: THEME_COLORS.textPrimary }}
            >
              Admin Panel
            </h3>
            <p
              className="text-xs text-center"
              style={{ color: THEME_COLORS.textSecondary }}
            >
              Dashboard Control
            </p>
          </div>
          <nav className="space-y-3 w-full">
            {/* Nav Item: Analytics */}
            <button
              onClick={() => setActiveTab(TABS.ANALYTICS)}
              className="w-full flex items-center p-4 transition-all"
              style={{
                backgroundColor:
                  activeTab === TABS.ANALYTICS
                    ? THEME_COLORS.accent
                    : "transparent",
                color:
                  activeTab === TABS.ANALYTICS
                    ? "white"
                    : THEME_COLORS.textPrimary,
                borderRadius: "18px",
                boxShadow:
                  activeTab === TABS.ANALYTICS
                    ? "0 8px 20px rgba(187,61,37,.25)"
                    : "none",
                fontWeight: "600",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== TABS.ANALYTICS) {
                  e.currentTarget.style.backgroundColor =
                    THEME_COLORS.background;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== TABS.ANALYTICS) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <LayoutDashboard size={22} className="mr-3" />
              <span>Analytics</span>
            </button>

            {/* Nav Item: Moderation */}
            <button
              onClick={() => setActiveTab(TABS.MODERATION)}
              className="w-full flex items-center p-4 transition-all"
              style={{
                backgroundColor:
                  activeTab === TABS.MODERATION
                    ? THEME_COLORS.accent
                    : "transparent",
                color:
                  activeTab === TABS.MODERATION
                    ? "white"
                    : THEME_COLORS.textPrimary,
                borderRadius: "18px",
                boxShadow:
                  activeTab === TABS.MODERATION
                    ? "0 8px 20px rgba(187,61,37,.25)"
                    : "none",
                fontWeight: "600",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== TABS.MODERATION) {
                  e.currentTarget.style.backgroundColor =
                    THEME_COLORS.background;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== TABS.MODERATION) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <MessageSquare size={22} className="mr-3" />
              <span>Moderation</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main
          className="flex-grow p-4 sm:p-6 md:p-10 overflow-x-hidden"
          style={{
            backgroundColor: THEME_COLORS.background,
            minHeight: "100vh",
          }}
        >
          {activeTab === TABS.ANALYTICS && <DashboardAnalytics />}
          {activeTab === TABS.MODERATION && <ContentModeration />}
        </main>
      </div>
    </>
  );
}
