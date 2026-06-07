import { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectCurrentUser } from "../../redux/features/authSlice";
import { updateUser } from "../../redux/features/authSlice";
import { useUpdateProfileMutation, useChangePasswordMutation } from "../../redux/api/authApi";
import toast from "react-hot-toast";
import { selectToken } from "../../redux/features/authSlice"

export default function ProfilePage() {
  const user     = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const fileRef  = useRef(null);
  const token = useSelector(selectToken)

  const [updateProfile, { isLoading: updatingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPw }]     = useChangePasswordMutation();

  const [preview, setPreview] = useState(null);
  const [pwForm, setPwForm]   = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [sectionEdit, setSectionEdit] = useState(false);
const [sectionForm, setSectionForm] = useState({
  level: user?.level || 1,
  term:  user?.term  || 1,
});
const [sectionError, setSectionError] = useState("");
const [sectionLoading, setSectionLoading] = useState(false);


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };

  const handlePictureUpload = async () => {
    if (!fileRef.current?.files[0]) return;
    const formData = new FormData();
    formData.append("profilePicture", fileRef.current.files[0]);
    const result = await updateProfile(formData);
    if (!result.error) {
      dispatch(updateUser({ profilePicture: result.data.data.user.profilePicture }));
      toast.success("Profile picture updated!");
      setPreview(null);
    } else {
      toast.error(result.error.data?.message || "Upload failed.");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirm) return setPwError("Passwords do not match.");
    if (pwForm.newPassword.length < 8) return setPwError("New password must be at least 8 characters.");
    const result = await changePassword({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
    if (!result.error) {
      toast.success("Password changed successfully.");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } else {
      setPwError(result.error.data?.message || "Failed to change password.");
    }
  };

  const handleSectionUpdate = async (e) => {
  e.preventDefault();
  setSectionError("");
  setSectionLoading(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/update-profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // get token from useSelector(selectToken)
      },
      credentials: "include",
      body: JSON.stringify({
        level: Number(sectionForm.level),
        term:  Number(sectionForm.term),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    dispatch(updateUser({ level: Number(sectionForm.level), term: Number(sectionForm.term) }));
    toast.success("Academic section updated.");
    setSectionEdit(false);
  } catch (err) {
    setSectionError(err.message);
  } finally {
    setSectionLoading(false);
  }
};

  const ROLE_COLORS = {
    Student: "bg-gray-100 text-gray-700", CR: "bg-blue-100 text-blue-700",
    Teacher: "bg-purple-100 text-purple-700", Admin: "bg-amber-100 text-amber-700", SuperAdmin: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">My Profile</h1>

      {/* Avatar section */}
      <div className="card mb-6 p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            {preview || user?.profilePicture?.url ? (
              <img
                src={preview || user.profilePicture.url}
                alt={user?.name}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-blue-100"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 shadow-md ring-1 ring-gray-200 hover:bg-gray-50"
              title="Change photo"
            >
              📷
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.studentId} · {user?.email}</p>
            <span className={`mt-1 inline-block badge ${ROLE_COLORS[user?.role]}`}>{user?.role}</span>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {preview && (
          <div className="mt-4 flex gap-2">
            <button onClick={handlePictureUpload} disabled={updatingProfile} className="btn-primary flex-1 justify-center py-2 text-sm">
              {updatingProfile ? "Uploading…" : "Save Photo"}
            </button>
            <button onClick={() => { setPreview(null); fileRef.current.value = ""; }} className="btn-ghost py-2 text-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* Academic info */}
      <div className="card mb-6 p-6">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="font-semibold text-gray-900">Academic Info</h3>
    <button
      onClick={() => setSectionEdit((v) => !v)}
      className="text-xs text-blue-600 hover:underline"
    >
      {sectionEdit ? "Cancel" : "Edit Level/Term"}
    </button>
  </div>

  {sectionError && (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {sectionError}
    </div>
  )}

  <div className="space-y-2">
    {[
      ["Department", user?.dept],
      ["Batch",      user?.batch],
      ["Session",    user?.session],
    ].map(([label, value]) => (
      <div key={label} className="flex items-center justify-between border-b border-gray-50 py-1.5 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value}</span>
      </div>
    ))}

    {/* Level / Term — editable */}
    <div className="flex items-center justify-between border-b border-gray-50 py-1.5 last:border-0">
      <span className="text-sm text-gray-500">Level / Term</span>
      {sectionEdit ? (
        <form onSubmit={handleSectionUpdate} className="flex items-center gap-2">
          <select
            value={sectionForm.level}
            onChange={(e) => setSectionForm((f) => ({ ...f, level: e.target.value }))}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none"
          >
            {[1,2,3,4].map((l) => <option key={l} value={l}>L{l}</option>)}
          </select>
          <select
            value={sectionForm.term}
            onChange={(e) => setSectionForm((f) => ({ ...f, term: e.target.value }))}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none"
          >
            {[1,2].map((t) => <option key={t} value={t}>T{t}</option>)}
          </select>
          <button
            type="submit"
            disabled={sectionLoading}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            {sectionLoading ? "…" : "Save"}
          </button>
        </form>
      ) : (
        <span className="text-sm font-medium text-gray-900">
          L{user?.level} T{user?.term}
        </span>
      )}
    </div>
  </div>
</div>

      {/* Change password */}
      <div className="card p-6">
        <h3 className="mb-4 font-semibold text-gray-900">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          {pwError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{pwError}</div>
          )}
          <input
            type="password" placeholder="Current password" className="input text-sm"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
            required
          />
          <input
            type="password" placeholder="New password (min 8 chars)" className="input text-sm"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
            required
          />
          <input
            type="password" placeholder="Confirm new password" className="input text-sm"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            required
          />
          <button type="submit" disabled={changingPw} className="btn-primary w-full justify-center py-2 text-sm">
            {changingPw ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
