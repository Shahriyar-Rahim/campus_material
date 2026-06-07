import { RegisterForm } from "../../components/forms/RegisterForm.jsx";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">BAUST — Campus Materials Portal</p>
        </div>
        <div className="card p-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
