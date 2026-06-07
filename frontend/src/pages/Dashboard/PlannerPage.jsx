import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format, addDays, subDays, isValid, isBefore, isAfter } from "date-fns";
import toast from "react-hot-toast";
import { useRef } from "react";
import {
  useGetDailyPlannerQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useReorderTasksMutation,
  useDeleteTaskMutation,
} from "../../redux/api/plannerApi.js";
import { LoadingSpinner, NoData } from "../../components/ui/index.jsx";

function ProgressRing({ percent }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ - (percent / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={percent === 100 ? "#22c55e" : "#3b82f6"}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-900">{percent}%</span>
    </div>
  );
}

const STATUS_STYLES = {
  Pending:    "bg-gray-100    text-gray-600",
  InProgress: "bg-blue-100   text-blue-700",
  Done:       "bg-green-100  text-green-700",
  Overdue:    "bg-red-100    text-red-700",
};
const PRIORITY_DOT = { High: "bg-red-500", Medium: "bg-amber-500", Low: "bg-gray-400" };

function TaskCard({ task, index, onStatusChange, onDelete }) {
  const isClass = task.type === "class";

  return (
    <Draggable draggableId={task._id || task._id?.toString() || index.toString()} index={index} isDragDisabled={isClass}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 flex items-start gap-3 rounded-xl border p-3 transition-shadow ${
            snapshot.isDragging ? "shadow-lg border-blue-300 bg-blue-50" :
            isClass ? "border-purple-100 bg-purple-50" : "border-gray-100 bg-white"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {isClass ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs">🏫</span>
            ) : (
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[task.priority] || "bg-gray-400"}`} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium text-gray-900 truncate ${task.status === "Done" ? "line-through text-gray-400" : ""}`}>
                {isClass ? task.courseName || task.courseCode : task.taskName}
              </p>
              {isClass && (
                <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                  {task.type}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              {isClass ? (
                <span>{task.startTime} – {task.endTime} · {task.room}</span>
              ) : (
                <>
                  <span>{task.category}</span>
                  {task.deadline && <><span>·</span><span>{format(new Date(task.deadline), "h:mm a")}</span></>}
                  {task.buddyId && <><span>·</span><span className="text-green-600">👥 {task.buddyId.name}</span></>}
                </>
              )}
            </div>
          </div>

          {!isClass && (
            <div className="flex shrink-0 items-center gap-1">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value)}
                className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:outline-none ${STATUS_STYLES[task.status]}`}
              >
                {["Pending", "InProgress", "Done"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => onDelete(task._id)}
                className="rounded p-0.5 text-gray-300 hover:text-red-500"
              >✕</button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function AddTaskForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ 
    taskName: "", 
    category: "Academic", 
    priority: "Medium", 
    deadline: "", 
    description: "" 
  });
  const [createTask, { isLoading }] = useCreateTaskMutation();

  const validateAndParseDate = (dateString) => {
    if (!dateString) return null;
    const parsedDate = new Date(dateString);
    
    // Check if structural parsing failed entirely
    if (!isValid(parsedDate)) return null;

    // Prevent manual typos resulting in extreme values (e.g., Year 0202 instead of 2026)
    const year = parsedDate.getFullYear();
    if (year < 2020 || year > 2100) return null;

    return parsedDate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.taskName || !form.deadline) return;

    const validDate = validateAndParseDate(form.deadline);
    if (!validDate) {
      toast.error("Please provide a valid date/time (Year must be between 2020 and 2100)");
      return;
    }

    const result = await createTask({
      ...form,
      deadline: validDate.toISOString()
    });

    if (!result.error) {
      toast.success("Task added successfully!");
      setForm({ taskName: "", category: "Academic", priority: "Medium", deadline: "", description: "" });
      setOpen(false);
      onAdd?.();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-4 text-sm font-medium text-gray-500 hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600 transition-all active:scale-[0.99]"
        >
          <span className="text-lg font-bold">＋</span> Add New Task
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm sm:absolute sm:inset-0 sm:z-auto sm:bg-transparent sm:backdrop-blur-none sm:justify-start">
          <div className="absolute inset-0 -z-10 h-full w-full sm:hidden" onClick={() => setOpen(false)} />

          <form 
            onSubmit={handleSubmit} 
            className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl border border-gray-100 bg-white p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 sm:rounded-xl sm:border-blue-200 sm:bg-blue-50/70 sm:p-4 sm:shadow-none sm:animate-none"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 sm:hidden" />

            <div className="flex items-center justify-between sm:hidden">
              <h3 className="text-base font-bold text-gray-900">Create New Task</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xl p-1">✕</button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider sm:hidden">Task Title</label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all sm:py-2"
                placeholder="What needs to be done? *"
                value={form.taskName}
                onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))}
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200/40">
                  {["Academic", "Personal"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                        form.category === cat ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {cat === "Academic" ? "📚 " : "🎯 "}{cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
                <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200/40">
                  {["Low", "Medium", "High"].map((prio) => {
                    const activeColors = {
                      Low: "bg-white text-gray-600 shadow-sm border border-gray-200/60",
                      Medium: "bg-amber-50 text-amber-700 shadow-sm border border-amber-200/60",
                      High: "bg-red-50 text-red-700 shadow-sm border border-red-200/60"
                    };
                    return (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, priority: prio }))}
                        className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                          form.priority === prio ? activeColors[prio] : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {prio}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date & Time</label>
              <input
                type="datetime-local"
                min="2020-01-01T00:00"
                max="2100-12-31T23:59"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all sm:py-2"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                required
              />
            </div>

            <div className="flex gap-2 pt-2 pb-4 sm:pb-0">
              <button 
                type="button" 
                onClick={() => setOpen(false)} 
                className="hidden sm:block btn-ghost py-2 text-sm font-medium border border-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isLoading} 
                className="btn-primary w-full justify-center py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20 rounded-xl active:scale-[0.98] transition-all sm:py-2"
              >
                {isLoading ? "Saving Task..." : "✓ Confirm and Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default function PlannerPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showCalendarInput, setShowCalendarInput] = useState(false);
  const { data, isLoading, refetch } = useGetDailyPlannerQuery(date);

  const alertedTasks = useRef(new Set());
  const audioPlayer = useRef(new Audio("/notification.mp3"));

  const [updateTask]   = useUpdateTaskMutation();
  const [reorderTasks] = useReorderTasksMutation();
  const [deleteTask]   = useDeleteTaskMutation();
  const [localTimeline, setLocalTimeline] = useState([]);

  const timeline  = data?.data?.timeline  || [];
  const overdue   = data?.data?.overdueTasks || [];
  const summary   = data?.data?.summary;

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      const timeline = data?.data?.timeline || [];

      timeline.forEach((item) => {
        if (item.type === "task" && item.status !== "Done" && item.deadline) {
          const deadlineDate = new Date(item.deadline);
          if (
            !alertedTasks.current.has(item._id) &&
            now >= deadlineDate &&
            now < addDays(deadlineDate, 1)
          ) {
            triggerAlert(item);
            alertedTasks.current.add(item._id);
          }
        }
      });
    };

    const interval = setInterval(checkDeadlines, 10000);
    return () => clearInterval(interval);
  }, [data]);

  const triggerAlert = (task) => {
    audioPlayer.current.play().catch(e => console.log("Audio play blocked"));
    toast.error(`⏰ Deadline Reached: ${task.taskName}`, { duration: 6000, position: "top-center" });

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Task Reminder", {
        body: `It's time for: ${task.taskName}`,
        icon: "/logo192.png",
      });
    }
  };

  useEffect(() => { setLocalTimeline(timeline); }, [JSON.stringify(timeline)]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(localTimeline);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLocalTimeline(items);

    const taskItems = items.filter((i) => i.type === "task");
    await reorderTasks(taskItems.map((t, idx) => ({ id: t._id, order: idx })));
  };

  const handleStatusChange = async (id, status) => {
    await updateTask({ id, status });
    refetch();
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    toast.success("Task removed.");
    refetch();
  };

  // Validates the primary landscape date header change input
  const handleMainDateChange = (e) => {
    const value = e.target.value;
    if (!value) return;

    const parsed = new Date(value);
    const year = parsed.getFullYear();

    if (!isValid(parsed) || year < 2020 || year > 2100) {
      toast.error("Invalid calendar year tracking parameter.");
      return;
    }
    setDate(value);
    setShowCalendarInput(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Planner</h1>
          <button 
            onClick={() => setShowCalendarInput(!showCalendarInput)}
            className="text-left text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
          >
            📅 {format(new Date(date), "EEEE, MMMM d, yyyy")}
          </button>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 sm:bg-transparent sm:p-0 sm:border-none">
          <button onClick={() => setDate(format(subDays(new Date(date), 1), "yyyy-MM-dd"))} className="btn-ghost px-3 py-2 sm:p-2">←</button>
          <button onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))} className="rounded-lg bg-white shadow-sm sm:shadow-none border border-gray-200/50 sm:border-none px-4 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">Today</button>
          <button onClick={() => setDate(format(addDays(new Date(date), 1), "yyyy-MM-dd"))} className="btn-ghost px-3 py-2 sm:p-2">→</button>
        </div>
      </div>

      {/* Top Expansion Area for safe Date Navigation */}
      {showCalendarInput && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2 animate-in fade-in duration-150">
          <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Jump to Date</label>
          <div className="flex gap-2">
            <input
              type="date"
              min="2020-01-01"
              max="2100-12-31"
              value={date}
              onChange={handleMainDateChange}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button 
              onClick={() => setShowCalendarInput(false)}
              className="rounded-lg bg-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Progress summary */}
      {summary && (
        <div className="mb-6 card flex items-center gap-5 p-4">
          <ProgressRing percent={summary.progressPercent} />
          <div className="grid grid-cols-3 flex-1 gap-3 text-center">
            {[
              { label: "Total",    value: summary.totalTasks },
              { label: "Done",     value: summary.doneTasks },
              { label: "Pending",  value: summary.pendingTasks },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          {summary.hasRoutine && (
            <div className="text-center">
              <p className="text-lg font-bold text-purple-700">{summary.totalClasses}</p>
              <p className="text-xs text-gray-500">Classes</p>
            </div>
          )}
        </div>
      )}

      {/* Overdue tasks */}
      {overdue.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-medium text-red-600">⚠ Overdue</h2>
          {overdue.map((task, i) => (
            <TaskCard key={task._id} task={task} index={i}
              onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Timeline */}
      <h2 className="mb-3 text-sm font-medium text-gray-700">Timeline</h2>
      {isLoading ? (
        <LoadingSpinner />
      ) : localTimeline.length === 0 ? (
        <NoData icon="📅" title="Nothing scheduled today." subtitle="Add a task below to get started." />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="timeline">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {localTimeline.map((item, index) => (
                  <TaskCard
                    key={item._id || `class-${index}`}
                    task={item}
                    index={index}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Add task */}
      <div className="mt-4">
        <AddTaskForm onAdd={refetch} />
      </div>
    </div>
  );
}