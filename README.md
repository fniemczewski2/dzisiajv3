# Dzisiaj v3 - Personal Productivity & Life Management App

**Dzisiaj v3** is a comprehensive Polish-language web application for managing time, tasks, and productivity. Built with Next.js and Supabase, it offers an all-in-one solution for organizing daily life, from task management to financial tracking.

![Version](https://img.shields.io/badge/version-1.17.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0.7-black)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)

## 🌟 Overview

Dzisiaj v3 (meaning "Today v3" in Polish) is a feature-rich Progressive Web App (PWA) designed to help users organize their entire life in one place. Whether you're managing tasks, tracking expenses, planning events, or maintaining healthy habits, Dzisiaj v3 has you covered.

**Live Demo:** [https://dzisiajv3.vercel.app](https://dzisiajv3.vercel.app)

## ✨ Key Features

### 📋 Productivity & Tasks
- **Task Management** - Organize tasks with priorities, categories, dates, and filters
- **Pomodoro Timer** - Boost productivity with the Pomodoro technique
- **Eisenhower Matrix** - Prioritize tasks using urgent/important quadrants
- **Kanban Board** - Manage tasks with drag-and-drop status columns
- **Day Schema** - Create and follow daily routines and schedules
- **Focus Mode** - Distraction-free task completion with timers
- **Task Reminders** - Set recurring reminders for important tasks

### 📅 Organization & Planning
- **Calendar** - Plan events, meetings, and deadlines
- **Event Export** - Export calendar events as .ics files
- **Notes** - Create and organize personal notes
- **Reports** - Generate meeting reports with agendas, participants, and action items
- **Reminders** - Set up recurring reminders
- **Packing Lists** - Pre-built lists for backpack, suitcase, and emergency bag (ICE)

### 💰 Finance & Budget
- **Bill Tracking** - Monitor expenses and income
- **Annual Budget** - Analyze monthly spending and income with statistics
- **Budget Visualization** - Charts and tables for financial insights
- **Daily Spending Tracker** - Track day-to-day expenses
- **Shopping Lists** - Create and share shopping lists with checkboxes
- **Recipes** - Manage recipes with ingredients and categories

### 🏃 Lifestyle & Health
- **Habits Tracking** - Track daily habits (pills, workouts, water intake, etc.)
- **Goals & Streaks** - Set and monitor long-term goals with streak counting
- **Interval Training** - Plan and track workout sessions
- **Water Tracker** - Monitor daily water consumption
- **Weather** - Check current weather and forecasts for your location

### 🎬 Entertainment
- **Places** - Save and catalog interesting places with maps and tags
- **Google Places Import** - Import saved places from Google Maps
- **Movies List** - Track movies to watch and already watched
- **Movie Rating** - Rate and categorize films by genre and platform

### 🛠️ Technical Features
- **PWA Support** - Install as a native app on any device
- **Offline Mode** - Full functionality without internet connection
- **Cloud Sync** - Real-time synchronization via Supabase
- **User Sharing** - Share tasks, events, and lists with other users
- **Push Notifications** - Receive reminders and alerts
- **Responsive Design** - Optimized for mobile, tablet, and desktop
- **Multi-user Support** - Share the app with family members

## 🏗️ Tech Stack

### Frontend
- **Next.js 16.0.7** - React framework with server-side rendering
- **React 19.2.0** - UI component library
- **TypeScript 5.9.3** - Type-safe development
- **Tailwind CSS 3.0** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend & Database
- **Supabase** - Backend-as-a-Service (authentication, database, real-time)
- **PostgreSQL** - Relational database (via Supabase)

### Key Libraries
- **@dnd-kit** - Drag-and-drop functionality for Kanban and Eisenhower
- **FullCalendar** - Calendar component
- **Leaflet** - Interactive maps for places
- **date-fns** - Date manipulation
- **jsPDF & pdfmake** - PDF generation
- **next-pwa** - Progressive Web App support
- **web-push** - Push notifications

## 📊 Database Schema

The application uses Supabase/PostgreSQL with the following main tables:

- `tasks` - User tasks with priorities, categories, and due dates
- `bills` - Financial transactions (income/expenses)
- `notes` - Personal notes with items
- `events` - Calendar events with recurrence support
- `recipes` - Cooking recipes with ingredients
- `places` - Saved locations with coordinates and tags
- `movies` - Movie watchlist and ratings
- `daily_habits` - Daily habit tracking
- `streaks` - Long-term goals with streak counting
- `shopping_lists` - Shared shopping lists
- `reports` - Meeting reports
- `day_schemas` - Daily schedule templates
- `reminders` - Recurring reminders

## 🎨 Features in Detail

### Task Management
- Create, edit, and delete tasks
- Set priorities (Low, Medium, High)
- Categorize tasks (Work, Personal, Shopping, Health, etc.)
- Assign due dates
- Filter by category, priority, status
- Sort by date, priority, or creation time
- Share tasks with other users
- Time context badges (Today, This Week, Overdue)

### Pomodoro Timer
- Customizable work/break intervals
- Visual and audio notifications
- Session tracking
- Task integration

### Eisenhower Matrix
- Drag-and-drop task organization
- Four quadrants: Urgent-Important, Important-Not Urgent, Urgent-Not Important, Neither
- Visual prioritization

### Kanban Board
- Customizable columns (To Do, In Progress, Done, etc.)
- Drag-and-drop task movement
- Status tracking

### Calendar
- Event creation with start/end times
- Recurring events (weekly, monthly, yearly)
- Event sharing
- .ics import/export

### Budget Tracker
- Income and expense tracking
- Monthly/yearly statistics
- Budget planning
- Visual tables

### Places & Maps
- Interactive map with markers
- Tag-based categorization
- Import from Google Maps exports
- Save location details (phone, website, hours)
- Custom notes for each place

## 📱 PWA Features

- **Offline Support** - Works without internet connection
- **Install to Home Screen** - Install as a native app
- **Push Notifications** - Receive reminders even when app is closed
- **Background Sync** - Sync data when connection is restored
- **App-like Experience** - Full-screen mode

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## 🔐 Authentication

The app uses Supabase Authentication with support for:
- Google login
- Session management
- User profiles
- Multi-user collaboration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary. All rights reserved.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- UI components with [Tailwind CSS](https://tailwindcss.com/)

## 📧 Contact

For questions or support, please open an issue in the repository.
