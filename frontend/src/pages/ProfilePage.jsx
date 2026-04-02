import { useAuth } from "../hooks/useAuth";

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <section className="profile-card">
      <div>
        <p className="eyebrow">Profile</p>
        <h1>{user?.name}</h1>
      </div>

      <dl className="profile-grid">
        <div>
          <dt>Email</dt>
          <dd>{user?.email || "No email"}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user?.role || "user"}</dd>
        </div>
        <div>
          <dt>Wallet</dt>
          <dd>{user?.walletAddress || "Not connected yet"}</dd>
        </div>
        <div>
          <dt>User ID</dt>
          <dd>{user?.id || "Unknown"}</dd>
        </div>
      </dl>
    </section>
  );
}
