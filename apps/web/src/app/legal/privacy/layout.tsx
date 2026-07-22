import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AutoDM | Instagram Automation Platform",
  description:
    "Read the AutoDM Privacy Policy. Learn how we collect, use, share, and protect your personal data when you use our Instagram DM automation service.",
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
