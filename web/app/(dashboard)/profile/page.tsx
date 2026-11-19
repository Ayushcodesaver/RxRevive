import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardGate } from "@/components/dashboard/gate";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const gate = await dashboardGate();
  if (!gate.ok) {
    return <section className="section"><div className="container">{gate.node}</div></section>;
  }
  const user = await currentUser();
  const { sessionClaims } = await auth();

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account, managed by Clerk. RxRevive stores only the id, name and email." />
      <section className="section">
        <div className="container">
          <div className="well" style={{ maxWidth: 640 }}>
            <h3 className="card-title">Account details</h3>
            <dl className="breakdown">
              <div className="breakdown-row"><dt>Name</dt><dd>{user?.fullName || "-"}</dd></div>
              <div className="breakdown-row"><dt>Email</dt><dd>{user?.primaryEmailAddress?.emailAddress || "-"}</dd></div>
              <div className="breakdown-row"><dt>Clerk user id</dt><dd>{gate.userId}</dd></div>
              <div className="breakdown-row"><dt>Session status</dt><dd>{sessionClaims ? "signed in" : "-"}</dd></div>
            </dl>
            <p className="muted small">
              Manage your email, password and connected accounts in the Clerk profile panel (the avatar button in the
              navigation bar).
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
