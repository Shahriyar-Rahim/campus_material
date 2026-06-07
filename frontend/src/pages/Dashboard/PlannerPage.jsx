import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format, addDays, subDays } from "date-fns";
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
          {/* Drag handle / class indicator */}
          <div className="mt-0.5 shrink-0">
            {isClass ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs">🏫</span>
            ) : (
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[task.priority] || "bg-gray-400"}`} />
            )}
          </div>

          {/* Content */}
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

          {/* Status / actions */}
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
  const [form, setForm] = useState({ taskName: "", category: "Academic", priority: "Medium", deadline: "", description: "" });
  const [createTask, { isLoading }] = useCreateTaskMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.taskName || !form.deadline) return;
    const result = await createTask(form);
    if (!result.error) {
      toast.success("Task added!");
      setForm({ taskName: "", category: "Academic", priority: "Medium", deadline: "", description: "" });
      setOpen(false);
      onAdd?.();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-200 p-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
      >
        <span>+</span> Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <input
        className="input text-sm"
        placeholder="Task name *"
        value={form.taskName}
        onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))}
        autoFocus required
      />
      <div className="grid grid-cols-2 gap-2">
        <select className="input text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          <option>Academic</option>
          <option>Personal</option>
        </select>
        <select className="input text-sm" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <input
        type="datetime-local"
        className="input text-sm"
        value={form.deadline}
        onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
        required
      />
      <div className="flex gap-2">
        <button type="submit" disabled={isLoading} className="btn-primary flex-1 justify-center py-2 text-sm">
          {isLoading ? "Adding…" : "Add Task"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}


export default function PlannerPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
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

  // 1. Request Notification Permission on Mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 2. Deadline Watcher logic
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      const timeline = data?.data?.timeline || [];

      timeline.forEach((item) => {
        // Only alert for tasks (not classes) that aren't 'Done' and haven't alerted yet
        if (item.type === "task" && item.status !== "Done" && item.deadline) {
          const deadlineDate = new Date(item.deadline);
          
          // Trigger if current time is within the same minute as deadline
          if (
            !alertedTasks.current.has(item._id) &&
            now >= deadlineDate &&
            now < addDays(deadlineDate, 1) // Ensure it's for today
          ) {
            triggerAlert(item);
            alertedTasks.current.add(item._id);
          }
        }
      });
    };

    const interval = setInterval(checkDeadlines, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [data]);

  // 3. The Alert Function
  const triggerAlert = (task) => {
    // Sound
    audioPlayer.current.play().catch(e => console.log("Audio play blocked"));

    // Toast Popup
    toast.error(`⏰ Deadline Reached: ${task.taskName}`, {
      duration: 6000,
      position: "top-center",
    });

    // Browser Notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Task Reminder", {
        body: `It's time for: ${task.taskName}`,
        icon: "/logo192.png", // Path to your app icon
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Planner</h1>
          <p className="text-sm text-gray-500">{format(new Date(date), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(format(subDays(new Date(date), 1), "yyyy-MM-dd"))} className="btn-ghost p-2">←</button>
          <button onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))} className="rounded-lg px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50">Today</button>
          <button onClick={() => setDate(format(addDays(new Date(date), 1), "yyyy-MM-dd"))} className="btn-ghost p-2">→</button>
        </div>
      </div>

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

      {/* Timeline (draggable) */}
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
