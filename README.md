# 🍽️ What We Eat – Group Dining Decision Platform

A fun, fast, and fair way for groups in Thailand to decide where and what to eat.

---

## 📌 Background
In Thai culture, eating together with friends, family, or colleagues is important, but deciding *where to eat* often leads to wasted time and conflicts.  

Existing apps like GrabFood, Wongnai, or LINE MAN focus mainly on food ordering, not on helping groups reach a fair decision.  

**Problem to solve:**  
Enable groups to decide on a restaurant quickly and fairly, considering local cuisine, budget, and group preferences.

---

## 🎯 Objectives
- Help groups decide on a restaurant efficiently.  
- Ensure fairness (everyone has input).  
- Provide smart recommendations (location, cuisine, ratings, allergies, mood).  
- Save time and reduce conflicts.

---

## ⚙️ Key Features
- **Room-based Group Decision** – Create/join rooms via QR or code.  
- **Preference Setup** – Each participant sets cuisine, budget, allergies, mood.  
- **Smart Suggestions** – Restaurants fetched from APIs (Google Maps, Wongnai, GrabFood, LINE MAN).  
- **Group Voting** – Swipe/list interface for Accept/Reject.  
- **Fair Decision-Making** – Final choice based on majority with smart tie-break rules.  
- **Post-Dining Feedback** – Ratings & optional photo uploads.  
- **Admin Tools** – Moderate reviews/photos, manage data, analytics.  

---

## 🔒 Privacy
- Admins see only flagged content or aggregated statistics.  
- Votes and preferences are private to the group.  
- Data stored securely in **Thailand** (PDPA-compliant).  

---

## 🛠️ Tech Stack
- **Frontend**: React, Next.js ([Vercel](https://vercel.com/))  
- **Backend**: Next.js ([Railway](https://railway.com/) or Google Cloud)  
- **Database**: PostgreSQL  
- **Deployment**: Docker + GitHub Actions (CI/CD)  
- **APIs**: Google Maps, Wongnai  

---

## 🚀 Usage Flow
1. **Create/Join Room** – Host shares code or QR.  
2. **Set Preferences** – Cuisine, budget, mood, allergies.  
3. **Suggestions** – Restaurants fetched & filtered by APIs.  
4. **Voting** – Group members Accept/Reject.  
5. **Decision** – Highest approval wins (fair tie-break).  
6. **Result** – Chosen restaurant shown with map directions + share option.  
7. **Feedback** – Quick rating & photos for better future recs.  

---

## 👤 User Roles
- **Guest** – Join rooms, set preferences, vote.  
- **Registered User** – History, reviews, photos, personalized suggestions.  
- **Host** – Create/manage rooms (equal voting power).  
- **Admin** – Moderate content, manage restaurant data, monitor analytics.  

---

## 📍 Impact
- Saves time and reduces arguments.  
- Makes group dining more enjoyable.  
- Helps restaurants reach more potential customers.  

---

## Document
- ([GG Doc](https://docs.google.com/document/d/1lpNJAadCo4cqqWD7-w_K0akjBc4lDBaMn1u7tO5rYpU/edit?usp=sharing))
- ([Jira](https://ku-team-nattanan.atlassian.net/jira/software/projects/WWE/boards/38/backlog?atlOrigin=eyJpIjoiNzM0YjU2NDZlYzJkNDgyY2FmN2QzNGIyMjljZWJlNDEiLCJwIjoiaiJ9))

---

## 📌 License
This project is for educational and research purposes.
