import * as React from "react"
import { format, setHours, setMinutes, addMinutes, isBefore, startOfDay } from "date-fns"
import { th } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: boolean
  minDate?: Date
  placeholder?: string
  className?: string
}

export function DateTimePicker({
  date,
  setDate,
  disabled = false,
  minDate,
  placeholder = "เลือกวันและเวลา",
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Generate time options (every 15 minutes)
  const timeOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour = h.toString().padStart(2, "0")
        const minute = m.toString().padStart(2, "0")
        options.push({
          value: `${hour}:${minute}`,
          label: `${hour}:${minute}`,
        })
      }
    }
    return options
  }, [])

  // Get current time value
  const currentTime = React.useMemo(() => {
    if (!date) return ""
    const h = date.getHours().toString().padStart(2, "0")
    const m = (Math.floor(date.getMinutes() / 15) * 15).toString().padStart(2, "0")
    return `${h}:${m}`
  }, [date])

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined)
      return
    }

    // If we already have a time, preserve it
    if (date) {
      const newDate = new Date(selectedDate)
      newDate.setHours(date.getHours())
      newDate.setMinutes(date.getMinutes())
      setDate(newDate)
    } else {
      // Default to next hour rounded up
      const now = new Date()
      const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15
      let newDate = setMinutes(setHours(selectedDate, now.getHours()), roundedMinutes)

      // If the time has passed for today, add 1 hour
      if (isBefore(newDate, now)) {
        newDate = addMinutes(newDate, 60)
      }

      setDate(newDate)
    }
  }

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    const newDate = date ? new Date(date) : new Date()
    newDate.setHours(hours)
    newDate.setMinutes(minutes)
    newDate.setSeconds(0)
    newDate.setMilliseconds(0)

    // If selected time is in the past for today, move to tomorrow
    const now = new Date()
    if (isBefore(newDate, now) && startOfDay(newDate).getTime() === startOfDay(now).getTime()) {
      newDate.setDate(newDate.getDate() + 1)
    }

    setDate(newDate)
  }

  // Disable past dates
  const disabledDays = React.useMemo(() => {
    const today = startOfDay(new Date())
    return { before: minDate || today }
  }, [minDate])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "d MMM yyyy, HH:mm", { locale: th })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            initialFocus
          />
          <div className="border-t sm:border-t-0 sm:border-l p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              <span>เวลา</span>
            </div>
            <Select value={currentTime} onValueChange={handleTimeSelect}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="เลือกเวลา" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {date && (
              <div className="pt-2 text-xs text-muted-foreground">
                {format(date, "EEEE d MMMM yyyy", { locale: th })}
                <br />
                เวลา {format(date, "HH:mm น.", { locale: th })}
              </div>
            )}
          </div>
        </div>
        <div className="border-t p-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDate(undefined)
              setIsOpen(false)
            }}
          >
            ล้าง
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={!date}
          >
            ตกลง
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Compact version for inline use - Calendar always visible + Time input
interface DateTimePickerInlineProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  minDate?: Date
}

export function DateTimePickerInline({
  date,
  setDate,
  minDate,
}: DateTimePickerInlineProps) {
  // เริ่มต้นด้วยเวลาปัจจุบัน
  const getDefaultTime = () => {
    const now = new Date()
    const h = now.getHours().toString().padStart(2, "0")
    const m = now.getMinutes().toString().padStart(2, "0")
    return `${h}:${m}`
  }

  const [timeInput, setTimeInput] = React.useState(getDefaultTime)

  // Sync timeInput with date
  React.useEffect(() => {
    if (date) {
      const h = date.getHours().toString().padStart(2, "0")
      const m = date.getMinutes().toString().padStart(2, "0")
      setTimeInput(`${h}:${m}`)
    }
  }, [date])

  // Handle date selection from calendar
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined)
      return
    }

    // Preserve existing time or use default
    const newDate = new Date(selectedDate)
    const [hours, minutes] = timeInput.split(":").map(Number)
    if (!isNaN(hours) && !isNaN(minutes)) {
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
    } else {
      newDate.setHours(10)
      newDate.setMinutes(0)
    }
    newDate.setSeconds(0)
    newDate.setMilliseconds(0)
    setDate(newDate)
  }

  // Handle time text input change
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and colon, max 5 chars (HH:MM)
    const filtered = value.replace(/[^0-9:]/g, '').slice(0, 5)
    setTimeInput(filtered)
  }

  // Parse and apply time on blur
  const handleTimeBlur = () => {
    const match = timeInput.match(/^(\d{1,2}):?(\d{2})?$/)
    if (match) {
      let hours = parseInt(match[1], 10)
      let minutes = parseInt(match[2] || "0", 10)

      // Clamp values
      hours = Math.min(23, Math.max(0, hours))
      minutes = Math.min(59, Math.max(0, minutes))

      const formatted = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      setTimeInput(formatted)

      // Update date if selected
      if (date) {
        const newDate = new Date(date)
        newDate.setHours(hours)
        newDate.setMinutes(minutes)
        newDate.setSeconds(0)
        setDate(newDate)
      } else {
        // Create new date with today
        const newDate = new Date()
        newDate.setHours(hours)
        newDate.setMinutes(minutes)
        newDate.setSeconds(0)
        setDate(newDate)
      }
    } else {
      // Invalid format, reset to default
      setTimeInput("10:00")
    }
  }

  const disabledDays = React.useMemo(() => {
    const today = startOfDay(new Date())
    return { before: minDate || today }
  }, [minDate])

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar always visible */}
      <Calendar
        mode="single"
        selected={date}
        onSelect={handleDateSelect}
        disabled={disabledDays}
      />

      {/* Time input - 24hr format */}
      <div className="flex items-center gap-3 px-1">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          เวลา
        </label>
        <Input
          type="text"
          value={timeInput}
          onChange={handleTimeInputChange}
          onBlur={handleTimeBlur}
          placeholder="HH:MM"
          className="w-[80px] bg-background text-center font-mono"
          maxLength={5}
        />
        <span className="text-sm text-muted-foreground">น. (00:00-23:59)</span>
      </div>

      {/* Selected datetime summary */}
      {date && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          จะส่งเมื่อ{" "}
          <span className="font-medium text-foreground">
            {format(date, "EEEE d MMMM yyyy", { locale: th })}
          </span>
          {" เวลา "}
          <span className="font-medium text-foreground">
            {format(date, "HH:mm น.", { locale: th })}
          </span>
        </div>
      )}
    </div>
  )
}
