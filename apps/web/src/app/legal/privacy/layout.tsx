import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Flow mint | Instagram Automation Platform",
  description:
    "Read the Flow mint Privacy Policy. Learn how we collect, use, share, and protect your personal data when you use our Instagram DM automation service.",
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
