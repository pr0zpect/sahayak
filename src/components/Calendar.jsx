import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = ({ appointments = [], onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026 for demo
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const isToday = (day) => {
    // For demo, treat Aug 25, 2026 as "today"
    return day === 25 && currentDate.getMonth() === 7 && currentDate.getFullYear() === 2026;
  };

  const hasEvent = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.some(apt => apt.date === dateStr);
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    if (onSelectDate) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onSelectDate(dateStr);
    }
  };

  // Generate calendar grid
  const days = [];
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day other-month"></div>);
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const _isToday = isToday(d);
    const _hasEvent = hasEvent(d);
    const _isSelected = selectedDate === d;
    
    let className = 'calendar-day';
    if (_isToday) className += ' today';
    if (_hasEvent && !_isToday) className += ' has-event';
    if (_isSelected && !_isToday) className += ' selected';

    days.push(
      <div 
        key={`day-${d}`} 
        className={className}
        onClick={() => handleDateClick(d)}
      >
        {d}
      </div>
    );
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="font-bold text-lg">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm btn-icon" onClick={prevMonth}><ChevronLeft size={20}/></button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={nextMonth}><ChevronRight size={20}/></button>
        </div>
      </div>
      
      <div className="calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-name">{day}</div>
        ))}
        {days}
      </div>
    </div>
  );
};

export default Calendar;
