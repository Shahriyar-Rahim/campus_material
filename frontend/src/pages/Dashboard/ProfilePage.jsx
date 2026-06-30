import { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectCurrentUser, updateUser } from "../../redux/features/authSlice";
import {
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from "../../redux/api/authApi";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const user = useSelector(selectCurrentUser);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const fileRef = useRef(null);

  const [updateProfile, { isLoading: updatingProfile }] =
    useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPw }] =
    useChangePasswordMutation();

  const [preview, setPreview] = useState(null);
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [pwError, setPwError] = useState("");

  // Section edit layout parameters
  const [sectionEdit, setSectionEdit] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    level: user?.level || 1,
    term: user?.term || 1,
    session: user?.session || "",
    sessionStartDate: user?.sessionDuration?.startDate
      ? new Date(user.sessionDuration.startDate).toISOString().split("T")[0]
      : "",
    sessionEndDate: user?.sessionDuration?.endDate
      ? new Date(user.sessionDuration.endDate).toISOString().split("T")[0]
      : "",
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

    try {
      const res = await updateProfile(formData).unwrap();
      dispatch(updateUser(res.data.user));
      setPreview(null);
      toast.success("Profile picture updated successfully!");
    } catch (err) {
      toast.error(err.data?.message || "Failed to upload image.");
    }
  };

  // const handleSectionUpdate = async (e) => {
  //   e.preventDefault();
  //   setSectionError("");
  //   setSectionLoading(true);
  //   try {
  //     const res = await fetch(
  //       `${import.meta.env.VITE_API_URL}/auth/update-profile`,
  //       {
  //         method: "PATCH",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         credentials: "include",
  //         body: JSON.stringify({
  //           level: Number(sectionForm.level),
  //           term: Number(sectionForm.term),
  //           session: sectionForm.session,
  //           sessionDuration: {
  //             startDate: sectionForm.sessionStartDate || null,
  //             endDate: sectionForm.sessionEndDate || null,
  //           },
  //         }),
  //       },
  //     );
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.message);
  //     dispatch(
  //       updateUser({
  //         level: Number(sectionForm.level),
  //         term: Number(sectionForm.term),
  //         session: sectionForm.session,
  //         sessionDuration: {
  //           startDate: sectionForm.sessionStartDate || null,
  //           endDate: sectionForm.sessionEndDate || null,
  //         },
  //       }),
  //     );
  //     toast.success("Academic info updated.");
  //     setSectionEdit(false);
  //   } catch (err) {
  //     setSectionError(err.message);
  //   } finally {
  //     setSectionLoading(false);
  //   }
  // };

  const handleSectionUpdate = async (e) => {
  e.preventDefault();
  setSectionError("");
  setSectionLoading(true);
  try {
    // 1. Use your existing RTK Query mutation hooks instead of native fetch
    const res = await updateProfile({
      level: Number(sectionForm.level),
      term: Number(sectionForm.term),
      session: sectionForm.session,
      sessionDuration: {
        startDate: sectionForm.sessionStartDate || null,
        endDate: sectionForm.sessionEndDate || null,
      },
    }).unwrap();

    // 2. Dispatch the updated user structure to your global Redux auth slice
    dispatch(updateUser(res.data.user));
    
    toast.success("Academic info updated.");
    setSectionEdit(false);
  } catch (err) {
    setSectionError(err.data?.message || err.message || "Failed to update info.");
  } finally {
    setSectionLoading(false);
  }
};

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");

    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }

    try {
      const res = await changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }).unwrap();

      dispatch(updateUser(res.data.user));
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success(
        "Password changed! Cryptographic lineage tracking log generated.",
      );
    } catch (err) {
      setPwError(err.data?.message || "Failed to modify password.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6 sm:p-6">
      {/* Top Banner Context Card */}
      <div className="card flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
        <div className="group relative h-24 w-24 shrink-0 rounded-full bg-gray-100">
          <img
            src={
              preview ||
              user?.profilePicture?.url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`
            }
            alt="Profile Avatar"
            className="h-24 w-24 rounded-full object-cover border border-gray-200"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            Change
          </button>
          <input
            type="file"
            ref={fileRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">
              {user?.studentId} • {user?.email}
            </p>
          </div>

          {preview && (
            <button
              onClick={handlePictureUpload}
              disabled={updatingProfile}
              className="btn-primary py-1 px-3 text-xs justify-center"
            >
              {updatingProfile ? "Uploading..." : "Save New Picture"}
            </button>
          )}
        </div>
      </div>

      {/* Academic Profile Details Information Form Component Section */}
      {/* Session edit */}
      <div className="card mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Academic Info</h3>
          <button
            onClick={() => setSectionEdit((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {sectionEdit ? "Cancel" : "Edit"}
          </button>
        </div>

        {sectionError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {sectionError}
          </div>
        )}

        {sectionEdit ? (
          <form onSubmit={handleSectionUpdate} className="space-y-3">
            {/* Level / Term */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Level
                </label>
                <select
                  value={sectionForm.level}
                  onChange={(e) =>
                    setSectionForm((f) => ({ ...f, level: e.target.value }))
                  }
                  className="input text-sm"
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>
                      L{l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Term
                </label>
                <select
                  value={sectionForm.term}
                  onChange={(e) =>
                    setSectionForm((f) => ({ ...f, term: e.target.value }))
                  }
                  className="input text-sm"
                >
                  {[1, 2].map((t) => (
                    <option key={t} value={t}>
                      T{t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Session */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Session
              </label>
              <input
                value={sectionForm.session}
                onChange={(e) =>
                  setSectionForm((f) => ({ ...f, session: e.target.value }))
                }
                placeholder="e.g. Winter 2026"
                className="input text-sm"
              />
            </div>

            {/* Session duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Session Start
                </label>
                <input
                  type="date"
                  value={sectionForm.sessionStartDate}
                  onChange={(e) =>
                    setSectionForm((f) => ({
                      ...f,
                      sessionStartDate: e.target.value,
                    }))
                  }
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Session End
                </label>
                <input
                  type="date"
                  value={sectionForm.sessionEndDate}
                  onChange={(e) =>
                    setSectionForm((f) => ({
                      ...f,
                      sessionEndDate: e.target.value,
                    }))
                  }
                  className="input text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sectionLoading}
              className="btn-primary w-full justify-center py-2 text-sm"
            >
              {sectionLoading ? "Saving…" : "Save Changes"}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            {[
              ["Department", user?.dept],
              ["Batch", user?.batch],
              ["Level / Term", `L${user?.level} T${user?.term}`],
              ["Session", user?.session || "Not set"],
              [
                "Session Start",
                user?.sessionDuration?.startDate
                  ? new Date(user.sessionDuration.startDate).toLocaleDateString(
                      "en-GB",
                    )
                  : "—",
              ],
              [
                "Session End",
                user?.sessionDuration?.endDate
                  ? new Date(user.sessionDuration.endDate).toLocaleDateString(
                      "en-GB",
                    )
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-gray-50 py-1.5 last:border-0"
              >
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password Panel Form Interface Block */}
      <div className="card p-6">
        <h3 className="mb-4 font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Security & Recovery Chain
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          {pwError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {pwError}
            </div>
          )}
          <input
            type="password"
            placeholder="Current password"
            className="input text-sm"
            value={pwForm.currentPassword}
            onChange={(e) =>
              setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
            }
            required
          />
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            className="input text-sm"
            value={pwForm.newPassword}
            onChange={(e) =>
              setPwForm((f) => ({ ...f, newPassword: e.target.value }))
            }
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            className="input text-sm"
            value={pwForm.confirm}
            onChange={(e) =>
              setPwForm((f) => ({ ...f, confirm: e.target.value }))
            }
            required
          />
          <button
            type="submit"
            disabled={changingPw}
            className="btn-primary w-full justify-center py-2.5 text-sm"
          >
            {changingPw
              ? "Processing Ledger Modifications..."
              : "Update Password & Notify"}
          </button>
        </form>
      </div>
    </div>
  );
}
