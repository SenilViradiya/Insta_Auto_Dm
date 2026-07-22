"use client";

import React, { useEffect, useState } from "react";
import styles from "./privacy.module.css";

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/legal/tos" },
  { label: "Privacy Policy", href: "/legal/privacy", active: true },
  { label: "Data Processing Addendum", href: "/legal/dpa" },
  { label: "Cookie Statement", href: "/legal/cookies" },
  { label: "Service Providers", href: "/legal/service-providers" },
  { label: "Service Level Agreement", href: "/legal/sla" },
];

const TOC_ITEMS = [
  { id: "how-we-collect", label: "How We Collect Personal Data" },
  { id: "types-of-data", label: "What Types of Personal Data We Process" },
  { id: "purposes", label: "For Which Purposes We Use Personal Data" },
  { id: "how-we-share", label: "How We Share Personal Data" },
  { id: "your-rights", label: "Your Data Protection Rights & Choices" },
  { id: "data-retention", label: "For How Long We Retain Personal Data" },
  { id: "international-transfers", label: "International Data Transfers" },
  { id: "childrens-info", label: "Children's Information" },
  { id: "security", label: "Security" },
  { id: "legal-basis", label: "Legal Basis for Processing (EEA, UK, Brazil)" },
  { id: "california-residents", label: "For California Residents" },
  { id: "changes", label: "Changes to Our Privacy Policy" },
  { id: "contact-us", label: "How to Contact Us" },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = TOC_ITEMS.map((item) => document.getElementById(item.id));
      const scrollPos = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPos) {
          setActiveSection(TOC_ITEMS[i].id);
          return;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* ── Header / Hero Section ── */}
      <header className={styles.headerSection}>
        <div className={styles.headerInner}>
          <div className={styles.headerBreadcrumb}>
            <a href="/">AutoDM</a>
            <span>›</span>
            <a href="/legal/privacy">Legal</a>
            <span>›</span>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Privacy Policy</span>
          </div>
          <h1 className={styles.headerTitle}>Privacy Policy</h1>
          <p className={styles.headerMeta}>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Effective Date: July 22, 2026
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Last Updated: July 22, 2026
            </span>
          </p>
        </div>
      </header>

      {/* ── Main Content Layout ── */}
      <div className={styles.contentLayout}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <h4 className={styles.sidebarTitle}>Legal Documents</h4>
          <nav className={styles.sidebarNav}>
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`${styles.sidebarLink} ${link.active ? styles.sidebarLinkActive : ""}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Sidebar TOC */}
          <h4 className={styles.sidebarTitle} style={{ marginTop: 32 }}>
            On This Page
          </h4>
          <nav className={styles.sidebarNav}>
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`${styles.sidebarLink} ${activeSection === item.id ? styles.sidebarLinkActive : ""}`}
                style={{ fontSize: 12.5, padding: "6px 14px" }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <div className={styles.contentCard}>
            {/* Table of Contents */}
            <div className={styles.tocSection}>
              <h3 className={styles.tocTitle}>Table of Contents</h3>
              <ol className={styles.tocList}>
                {TOC_ITEMS.map((item, idx) => (
                  <li key={item.id} className={styles.tocItem}>
                    <a href={`#${item.id}`} className={styles.tocLink}>
                      <span className={styles.tocNumber}>{idx + 1}.</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>

            {/* Introduction */}
            <div className={styles.introBlock}>
              <p className={styles.introText}>
                At AutoDM (&quot;AutoDM&quot;, &quot;we&quot;, &quot;us&quot;), we consider the privacy and security of personal data
                to be of the utmost importance. We process personal data for (1) our own purposes and (2) under
                the instructions of our customers who utilize the AutoDM service (the &quot;Service&quot;, encompassing
                any product or service provided by AutoDM), upload and maintain certain information in accordance
                with applicable data protection laws and regulations. In the latter case, we strictly adhere to
                customer instructions and do not use data for any purposes other than providing the Service.
              </p>
              <p className={styles.introText}>
                In this Privacy Policy, we describe how we process the personal data of the following data subjects
                for our own purposes:
              </p>
              <ul className={styles.introList}>
                <li className={styles.introListItem}>our customers, end users, and customer representatives,</li>
                <li className={styles.introListItem}>website users,</li>
                <li className={styles.introListItem}>newsletter subscribers,</li>
                <li className={styles.introListItem}>potential customers,</li>
                <li className={styles.introListItem}>our counterparties and their representatives.</li>
              </ul>
              <p className={styles.introText}>
                It covers information collected through the Service, on our website, or other websites administered
                by AutoDM where this Privacy Policy is posted (the &quot;Site&quot;), in our mobile applications, and
                from other sources.
              </p>
              <p className={styles.introText}>
                If you have any questions or suggestions regarding our privacy practices, please email us at{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>. Please also contact us if you would
                like to request data access or deletion, or to exercise other rights as a data subject.
              </p>
            </div>

            {/* ═══ Section 1: How We Collect Personal Data ═══ */}
            <section className={styles.policySection} id="how-we-collect">
              <span className={styles.sectionAnchor} />
              <h2 className={styles.sectionTitle}>1. How We Collect Personal Data</h2>
              <p className={styles.sectionText}>
                What personal data we collect depends largely on the interaction that takes place between you and
                AutoDM. Most of our data collection can be categorized as follows:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <strong>When you use the AutoDM Service or interact with an entity that uses AutoDM.</strong>{" "}
                  When you use the Service, we store all the content you provide, including information related to
                  you as a customer or an end user. We gather this information from you directly when you enter it,
                  or from integrations that you have linked to the Service (such as Instagram, Facebook, etc.). In
                  some cases, we may receive information from third parties, for example, from a payment service
                  provider confirming whether your payment was successful.
                </li>
                <li className={styles.bulletItem}>
                  <strong>When you send us emails or messages.</strong>{" "}
                  When we receive emails or messages from you via live chat, we may store the content of such
                  communications, any attachments, and your contact details.
                </li>
                <li className={styles.bulletItem}>
                  <strong>When you submit forms on the Site or participate in our events.</strong>{" "}
                  When you complete forms on our Site (contact us, subscription, demo request, event registration,
                  etc.), we collect your contact details and the information you provide. If we arrange joint events
                  with our partners, we may receive information from those partners.
                </li>
                <li className={styles.bulletItem}>
                  <strong>When you use the Site.</strong>{" "}
                  When you use the Site, we collect certain information (described in this policy) that may, alone
                  or in combination with other data, constitute personal data (e.g., cookie files).
                </li>
                <li className={styles.bulletItem}>
                  <strong>When you join our communities.</strong>{" "}
                  When you join our Instagram, Facebook, and other social media groups or accounts, we can view
                  data in your profile and process comments you post in our groups.
                </li>
              </ul>
            </section>

            {/* ═══ Section 2: Types of Personal Data ═══ */}
            <section className={styles.policySection} id="types-of-data">
              <h2 className={styles.sectionTitle}>2. What Types of Personal Data We Process</h2>
              <p className={styles.sectionText}>
                We collect and process the following categories of personal data:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <strong>Customer account details.</strong> To create or update your account and provide the
                  Service, we collect information from you and third-party integrations (e.g., Instagram). This
                  includes your user ID, name, email, account status, linked pages and accounts, products in use,
                  location, and gender.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Financial information.</strong> To process your payments for a Service subscription, we
                  may require credit card details (last four digits only), account details, and payment information.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Contact details and business data.</strong> We receive information about our customers
                  and potential customers for cooperation and communication purposes. This includes full name,
                  title, company, email, or other contact details as may be necessary.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Requests, messages, and submitted form details.</strong> We receive and process your
                  messages, support requests, emails, and information you share with us via online forms or social
                  media accounts. This includes the content of such communications as well as your contact details.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Usage data, logs, and other technical data.</strong> When you interact with the Service,
                  metadata and log data are collected automatically. Log data may include your IP address, browser
                  type and settings, date and time of use, pages or features browsed, time spent, frequency of use,
                  links clicked, and device identifiers. On mobile devices, this may also include the device type,
                  operating system, device settings, and unique device identifiers.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Email performance data.</strong> To track engagement and performance metrics of our
                  communications, we may use tracking pixels in email messages. Much of this data is aggregated.
                  If you wish to disable this tracking, you can do so by disabling images in the email itself.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Website cookies and similar technologies.</strong> We use cookie technology on the Site.
                  See our Cookie Statement for details.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Customer Content.</strong> As you use the Service or interact with it, you may import
                  personal data you have collected from your users, customers, social media and messaging platform
                  contacts (collectively &quot;Subscribers&quot;) or other individuals. We process this data only on your
                  behalf as our customer. We have no direct relationship with your Subscribers, and you are
                  responsible for ensuring you have the appropriate permission and legal basis for us to collect
                  and process information about those individuals.
                </li>
              </ul>
              <div className={styles.calloutBox}>
                We request that you do not send or disclose to us any sensitive personal data (e.g., social
                security numbers, information related to racial or ethnic origin, political opinions, religion,
                health, biometrics, genetic characteristics, criminal background, or union membership) on or
                through the Service or otherwise.
              </div>
            </section>

            {/* ═══ Section 3: Purposes ═══ */}
            <section className={styles.policySection} id="purposes">
              <h2 className={styles.sectionTitle}>3. For Which Purposes We Use Personal Data</h2>
              <p className={styles.sectionText}>
                We collect and process your personal data for the following purposes:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <strong>To operate the Service.</strong> We use data to enter into agreements with you as a
                  customer, operate, maintain, and administer your account in the Service, and communicate with
                  you regarding the account (sending announcements, technical notices, updates, security alerts,
                  and support and administrative messages). We also use your data to fulfill our billing obligations.
                </li>
                <li className={styles.bulletItem}>
                  <strong>To provide the Service.</strong> We process Customer Content information on your behalf
                  as a customer in accordance with our data processing terms.
                </li>
                <li className={styles.bulletItem}>
                  <strong>To communicate with you and inform you about the Service.</strong> If you request
                  information from us, register for the Service, complete a form, or participate in our surveys,
                  promotions, or events, we may send you marketing communications if permitted by law. In all
                  such communications, we will provide you with the option to opt-out. We may also use personal
                  data to display targeted advertisement campaigns on social media.
                </li>
                <li className={styles.bulletItem}>
                  <strong>To conduct events and communicate with you.</strong> We use your personal data provided
                  during event registration to send reminders, event-related communications, and service-related
                  information. We always provide the option to opt-out from communications.
                </li>
                <li className={styles.bulletItem}>
                  <strong>To comply with law.</strong> We use your personal data as necessary to comply with
                  applicable laws, including sanction requirements, accounting and tax obligations, legal processes,
                  or audits. Before disclosing any information to an authority upon its request, we verify the
                  validity of such request.
                </li>
                <li className={styles.bulletItem}>
                  <strong>To negotiate, enter into, and perform agreements.</strong> We collect and process
                  information about our counterparties and their representatives to negotiate and enter into
                  legally valid agreements.
                </li>
                <li className={styles.bulletItem}>
                  <strong>For compliance and safety.</strong> We use your personal data as we believe necessary
                  to (a) enforce the terms and conditions governing the Service; (b) protect our rights, privacy,
                  safety, or property; and (c) protect, investigate, and deter against fraudulent, harmful, or
                  illegal activity.
                </li>
              </ul>
              <p className={styles.sectionText}>
                We may also use anonymized Customer Content for product improvement and analytical purposes.
              </p>
            </section>

            {/* ═══ Section 4: How We Share ═══ */}
            <section className={styles.policySection} id="how-we-share">
              <h2 className={styles.sectionTitle}>4. How We Share Personal Data</h2>
              <p className={styles.sectionText}>
                We do not sell your data to third parties for commercial or advertising purposes. We share your
                data as described in this Privacy Policy or upon obtaining your consent.
              </p>
              <p className={styles.sectionText}>
                We disclose personal data to third parties under the following circumstances:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <strong>Service Providers.</strong> We employ third-party companies and individuals to help us
                  perform certain activities, e.g., payment service providers. We also use third-party software
                  to process data (CRM, email services, cloud storage, etc.). These third parties are permitted
                  to use your personal data only to perform designated tasks for lawful business purposes and for
                  no other purpose.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Advertising Partners.</strong> We may share limited personal data with advertising
                  partners to measure advertising effectiveness, build or refine audiences, and personalize ads
                  where permitted by law or your consent. This may include sharing certain pseudonymous identifiers
                  (e.g., hashed email addresses). We do not disclose raw email addresses to advertising partners.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Professional Advisors.</strong> We may disclose your personal data to professional
                  advisors such as lawyers, bankers, auditors, and insurers where necessary in the course of
                  the professional services they render to us.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Third-party Applications and Integrations.</strong> For the provision of the Service,
                  we receive and share data with integrations and apps linked by customers (Instagram, Facebook,
                  Stripe, PayPal, etc.), as well as applications developed through our developer program.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Business Transfers.</strong> In the event of a corporate sale, merger, reorganization,
                  dissolution, or similar event, personal data may be part of the transferred assets. Any
                  successor or acquirer will continue to have the right to use your personal data in accordance
                  with this Privacy Policy.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Compliance with Laws and Law Enforcement.</strong> AutoDM may disclose information about
                  you to government or law enforcement officials or private parties as required by law, and as we
                  believe necessary to comply with legal processes, enforce our terms, protect our rights, and
                  deter fraudulent or illegal activity.
                </li>
                <li className={styles.bulletItem}>
                  <strong>Corporate Affiliates.</strong> We may share personal data with our corporate affiliates.
                </li>
              </ul>
            </section>

            {/* ═══ Section 5: Your Rights ═══ */}
            <section className={styles.policySection} id="your-rights">
              <h2 className={styles.sectionTitle}>5. Your Data Protection Rights &amp; Choices</h2>
              <p className={styles.sectionText}>
                You, including any data subject whose personal data is processed by AutoDM in its capacity as a
                data controller, may have the following rights depending on the applicable legislation in your
                jurisdiction:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  If you wish to confirm the existence of processing of your personal data or access the personal
                  data that AutoDM collects, you can do so at any time by contacting us.
                </li>
                <li className={styles.bulletItem}>
                  You can also contact us to update, correct incomplete, inaccurate, or outdated data, or delete
                  information in your account.
                </li>
                <li className={styles.bulletItem}>
                  You have the right to request information about data sharing and with whom it is shared.
                </li>
                <li className={styles.bulletItem}>
                  You have the right to request information about the possibility of not providing consent and the
                  consequences of refusal.
                </li>
                <li className={styles.bulletItem}>
                  If you are in the European Economic Area (&quot;EEA&quot;), the UK, Brazil, or Switzerland, you can
                  object to processing, ask us to restrict processing, or request portability of your personal
                  data where technically possible.
                </li>
                <li className={styles.bulletItem}>
                  If we have collected and processed your personal data under your consent, you can withdraw your
                  consent at any time. Withdrawing consent will not affect the lawfulness of any processing
                  conducted prior to your withdrawal, nor processing conducted in reliance on other lawful grounds.
                </li>
                <li className={styles.bulletItem}>
                  You have the right not to be subject to a decision based solely on automated processing,
                  including profiling, which produces legal effects (&quot;Automated Decision-Making&quot;).
                </li>
                <li className={styles.bulletItem}>
                  You have the right to obtain additional information about international transfers of your
                  personal data and access the contractual regulation of such transfers.
                </li>
                <li className={styles.bulletItem}>
                  You have the right to complain to a data protection authority about our collection and use of
                  your personal data.
                </li>
              </ul>
              <p className={styles.sectionText}>
                You may submit your request by sending an email to{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>. We will respond to all requests in
                accordance with applicable data protection laws.
              </p>
              <h3 className={styles.subsectionTitle}>Access to Data Controlled by Our Customers</h3>
              <p className={styles.sectionText}>
                We do not have direct contractual relationships with our customers&#39; Subscribers — i.e., the
                individuals whose personal data is stored by our customers within the Service. An individual who
                seeks access, correction, amendment, or deletion of personal data processed in the Service by our
                customers is advised to direct their request to the customer directly.
              </p>
            </section>

            {/* ═══ Section 6: Data Retention ═══ */}
            <section className={styles.policySection} id="data-retention">
              <h2 className={styles.sectionTitle}>6. For How Long We Retain Personal Data</h2>
              <p className={styles.sectionText}>
                We will retain your personal data only for as long as necessary to fulfill the purposes for which
                it was collected or otherwise processed, and in accordance with applicable laws and legitimate
                business requirements.
              </p>
              <p className={styles.sectionText}>
                For example, we will retain and process personal data within the Service until you terminate the
                agreement with us, or your user account is terminated either at your explicit request or due to
                prolonged inactivity, as set forth in our Terms of Service. Once your account is deleted or
                deactivated, we will securely delete or anonymize your personal data, unless a longer retention
                period is required by law or necessary to establish, exercise, or defend legal claims.
              </p>
              <p className={styles.sectionText}>
                If you are located in Brazil, we may also be required to store access logs for a 6-month period
                to meet the requirements of the Brazilian Internet Act (Law 12,965 of April 23, 2014).
              </p>
              <p className={styles.sectionText}>
                We may also store some data during a retention period required by law or a timeframe necessary to
                resolve disputes, prevent abuse, and enforce our agreements.
              </p>
            </section>

            {/* ═══ Section 7: International Transfers ═══ */}
            <section className={styles.policySection} id="international-transfers">
              <h2 className={styles.sectionTitle}>7. International Data Transfers</h2>
              <p className={styles.sectionText}>
                AutoDM implements preventive and protective controls for international data transfers, including
                the use of Standard Contractual Clauses (SCCs) approved by competent authorities such as the
                European Commission and other relevant regulatory bodies. Where applicable, we also employ other
                contractual or organizational safeguards to ensure an adequate level of data protection.
              </p>
              <p className={styles.sectionText}>
                In all such cases, we take steps to ensure that personal data receives a level of protection
                consistent with applicable data protection laws. Please be aware that the personal data we collect
                can also be transferred to countries that provide a degree of data protection similar to or greater
                than your own jurisdiction, or to companies that contractually undertake to adopt an equivalent
                degree of protection.
              </p>
              <p className={styles.sectionText}>
                In the event that transfers to non-adequate jurisdictions are necessary, we will take reasonable
                steps to ensure that the information is processed with the same level of security. These steps
                include, but are not limited to, standard contractual clauses approved by the relevant data privacy
                supervisory authority, specific contractual clauses, and global corporate standards.
              </p>
              <h3 className={styles.subsectionTitle}>
                EU–US Data Privacy Framework, UK Extension, and Swiss–US Data Privacy Framework
              </h3>
              <p className={styles.sectionText}>
                AutoDM complies with the EU–US Data Privacy Framework program (EU–US DPF), the UK Extension to
                the EU–US DPF, and the Swiss–US Data Privacy Framework program (Swiss–US DPF) as set forth by the
                US Department of Commerce. AutoDM has certified that it adheres to the EU–US Data Privacy Framework
                Principles with regard to the processing of personal data received from the European Union,
                the United Kingdom (and Gibraltar), and Switzerland respectively.
              </p>
              <p className={styles.sectionText}>
                In compliance with the EU–US DPF, the Swiss–US DPF, and the UK Extension, AutoDM commits to refer
                unresolved complaints concerning our handling of personal data to an alternative dispute resolution
                provider. If you do not receive timely acknowledgment of your complaint from us, or if we have not
                addressed your complaint to your satisfaction, please visit{" "}
                <a href="https://go.adr.org/dpf_irm.html" target="_blank" rel="noopener noreferrer">
                  https://go.adr.org/dpf_irm.html
                </a>{" "}
                for more information or to file a complaint.
              </p>
              <p className={styles.sectionText}>
                AutoDM is subject to the investigatory and enforcement powers of the Federal Trade Commission
                (FTC) with respect to its compliance with the provisions of the EU–US DPF, the UK Extension to
                the EU–US DPF, and the Swiss–US DPF.
              </p>
              <p className={styles.sectionText}>
                AutoDM is committed to protecting the privacy and personal data in accordance with the provisions
                of the LGPD. If the customer&#39;s applicable data protection laws include the LGPD, international
                data transfers will be made in accordance with the International Data Transfer Regulation as
                approved by ANPD.
              </p>
            </section>

            {/* ═══ Section 8: Children's Information ═══ */}
            <section className={styles.policySection} id="childrens-info">
              <h2 className={styles.sectionTitle}>8. Children&#39;s Information</h2>
              <p className={styles.sectionText}>
                We believe it is important to provide added protection for children online. We encourage parents
                and guardians to spend time online with their children to observe, participate in, and monitor
                their online activity. The Site and the Service are not intended for use by anyone under the age
                of 18, nor does AutoDM knowingly collect or solicit personal data from anyone under the age of 18.
              </p>
              <p className={styles.sectionText}>
                If you are under 18, you may not attempt to register for the Service or send any information about
                yourself to us, including your name, address, telephone number, or email address. In the event
                that we confirm we have collected personal data from someone under the age of 18 without
                verification of parental consent, we will delete that information promptly.
              </p>
              <p className={styles.sectionText}>
                If you are a parent or legal guardian of a child under 18 and believe that we might have any
                information from or about such a child, please contact us at{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>.
              </p>
            </section>

            {/* ═══ Section 9: Security ═══ */}
            <section className={styles.policySection} id="security">
              <h2 className={styles.sectionTitle}>9. Security</h2>
              <h3 className={styles.subsectionTitle}>Safeguarding Your Information</h3>
              <p className={styles.sectionText}>
                We take reasonable and appropriate measures to protect personal data from loss, misuse, and
                unauthorized access, disclosure, alteration, and destruction, taking into account the risks
                involved in the processing and the nature of the personal data.
              </p>
              <p className={styles.sectionText}>
                While we make every effort to store personal data collected through the Site and the Service in a
                secure, access-controlled environment, please note that no system or transmission of data over the
                internet can be guaranteed to be 100% secure. Accordingly, although we strive to protect the
                integrity and confidentiality of personal data, we cannot absolutely ensure or warrant its security
                against unauthorized access, use, or disclosure.
              </p>
              <p className={styles.sectionText}>
                The credit card processing vendors we work with use industry-standard security measures to protect
                your information both during the transaction and after it is complete.
              </p>
              <p className={styles.sectionText}>
                If you have any questions about the security of your personal data, you may contact us at{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>.
              </p>
              <h3 className={styles.subsectionTitle}>Notice of Breach of Security</h3>
              <p className={styles.sectionText}>
                In the event of a security incident that results in unauthorized access to personal data and is
                likely to result in a risk to your rights and freedoms, we will notify you without undue delay
                after becoming aware of the breach. We will also provide information about the nature of the
                breach, measures taken to mitigate its effects, and actions implemented to prevent recurrence.
              </p>
            </section>

            {/* ═══ Section 10: Legal Basis ═══ */}
            <section className={styles.policySection} id="legal-basis">
              <h2 className={styles.sectionTitle}>
                10. Legal Basis for Processing Your Personal Data (Brazil, EEA, UK Visitors/Customers Only)
              </h2>
              <p className={styles.sectionText}>
                If you are a person located in Brazil, the EEA, or the UK, our legal basis for collecting and
                using the personal data described above will depend on the purpose of processing and the personal
                data concerned:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  We process data to perform a contract with you for the use of the Service (Art. 6(1)(b) of the
                  GDPR or UK GDPR, Art. 7 of LGPD).
                </li>
                <li className={styles.bulletItem}>
                  We also process data based on our legitimate interest (Art. 6(1)(f) of the GDPR or UK GDPR,
                  Art. 7 of LGPD) in the following cases:
                  <ul className={styles.nestedList}>
                    <li className={styles.nestedItem}>to communicate with you and inform you about our Service;</li>
                    <li className={styles.nestedItem}>to conduct events;</li>
                    <li className={styles.nestedItem}>for compliance and safety.</li>
                  </ul>
                </li>
                <li className={styles.bulletItem}>
                  We may also process your data based on your consent, where applicable (Art. 6(1)(a) of the
                  GDPR or UK GDPR, Art. 7(I) of the LGPD), for example, when you choose to receive marketing
                  communications or enable certain optional functionalities.
                </li>
                <li className={styles.bulletItem}>
                  We process some types of cookie files based on your consent. See our Cookie Statement for
                  more details.
                </li>
              </ul>
              <p className={styles.sectionText}>
                If we ask you to provide personal data to comply with a legal requirement or to enter into a
                contract, we will make this clear at the relevant time and advise you whether providing your
                personal data is mandatory (as well as the possible consequences if you do not). Similarly, if
                we collect and use your personal data in reliance on our legitimate business interests, we will
                make clear what those interests are.
              </p>
              <p className={styles.sectionText}>
                You are not obliged to provide your personal data to us. However, if we need personal data in
                order to enter into and perform the contract with you and you do not provide this data, we may
                not be able to perform the contract we have or are trying to enter into with you.
              </p>
              <p className={styles.sectionText}>
                If you have questions about the legal basis on which we collect and use your personal data, you
                may contact us at{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>.
              </p>
            </section>

            {/* ═══ Section 11: California Residents ═══ */}
            <section className={styles.policySection} id="california-residents">
              <h2 className={styles.sectionTitle}>11. For California Residents</h2>
              <p className={styles.sectionText}>
                If you are a resident of California, California Civil Code Section 1798.83 permits you to request
                information regarding how we disclosed your personal data to third parties for such parties&#39;
                direct marketing purposes during the preceding calendar year. To request this information, please
                contact us at <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>. We will respond to such
                requests within 30 days.
              </p>
              <p className={styles.sectionText}>
                Additionally, California data protection laws (California Consumer Privacy Act of 2018 and the
                California Privacy Rights Act of 2020, as each may be amended) give you the following specific
                rights:
              </p>

              <h3 className={styles.subsectionTitle}>1. Requests to Know</h3>
              <p className={styles.sectionText}>You have the right to request that we disclose:</p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>The categories of personal data we have collected about you;</li>
                <li className={styles.bulletItem}>
                  The categories of personal data about you we have sold or disclosed for a business purpose;
                </li>
                <li className={styles.bulletItem}>
                  The categories of sources from which we have collected personal data about you;
                </li>
                <li className={styles.bulletItem}>
                  The business or commercial purposes for selling, sharing, or collecting personal data about you;
                </li>
                <li className={styles.bulletItem}>
                  The categories of third parties to whom the personal data was sold or disclosed; and
                </li>
                <li className={styles.bulletItem}>The specific pieces of personal data collected.</li>
              </ul>

              <h3 className={styles.subsectionTitle}>2. Requests to Delete</h3>
              <p className={styles.sectionText}>
                You have the right to request that we delete any personal data about you that we have collected.
                Upon receiving a verified request, we will do so unless otherwise required or authorized by law.
              </p>

              <h3 className={styles.subsectionTitle}>3. Authorized Agents</h3>
              <p className={styles.sectionText}>
                You may designate an authorized agent to make requests on your behalf. You must provide authorized
                written permission to submit a request, and we may require that you verify your identity directly
                with us. This verification process is not necessary if your authorized agent provides documentation
                reflecting power of attorney under Cal. Prob. Code §§ 4121 to 4130.
              </p>

              <h3 className={styles.subsectionTitle}>4. Methods for Submitting Requests &amp; Our Response</h3>
              <p className={styles.sectionText}>
                You may submit a request for access or deletion of personal data via email at{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>. Upon receipt of a request, we may ask
                you for additional information to verify your identity. Any additional information you provide will
                be used only for verification purposes.
              </p>
              <p className={styles.sectionText}>
                We will acknowledge the receipt of your request within ten (10) business days. Subject to our
                ability to verify your identity, we will respond to your request within 45 calendar days of
                receipt. If we require more time (up to 90 days), we will inform you in writing. Disclosures will
                cover only the 12-month period preceding the request.
              </p>

              <h3 className={styles.subsectionTitle}>5. The Right to Non-Discrimination</h3>
              <p className={styles.sectionText}>
                You have the right not to be discriminated against for exercising your California privacy rights.
                Unless permitted by the California Consumer Privacy Act, we will not:
              </p>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>Deny you goods or services.</li>
                <li className={styles.bulletItem}>
                  Charge you different prices or rates for goods or services, including through granting discounts
                  or other benefits, or imposing penalties.
                </li>
                <li className={styles.bulletItem}>
                  Provide you with a different level or quality of goods or services.
                </li>
                <li className={styles.bulletItem}>
                  Suggest that you may receive a different price, rate, or quality of goods or services.
                </li>
              </ul>
            </section>

            {/* ═══ Section 12: Changes ═══ */}
            <section className={styles.policySection} id="changes">
              <h2 className={styles.sectionTitle}>12. Changes to Our Privacy Policy</h2>
              <p className={styles.sectionText}>
                We may need to update this Privacy Policy from time to time to reflect legal, technical, or
                business developments. When we update our Privacy Policy, we will take appropriate measures to
                inform you before its entry into force, consistent with the significance of the changes. We will
                obtain your consent to any material Privacy Policy changes if and where required by applicable data
                protection laws.
              </p>
              <p className={styles.sectionText}>
                You can see when this Privacy Policy was last updated by checking the &quot;Effective Date&quot; displayed
                at the top of this Privacy Policy. The new Privacy Policy will apply to all current and past users
                of the website and will replace any prior notices that are inconsistent with it.
              </p>
            </section>

            {/* ═══ Section 13: Contact Us ═══ */}
            <section className={styles.policySection} id="contact-us">
              <h2 className={styles.sectionTitle}>13. How to Contact Us</h2>
              <p className={styles.sectionText}>
                If you require any more information or have any questions about our Privacy Policy, please feel
                free to contact us by email at{" "}
                <a href="mailto:privacy@autodm.io">privacy@autodm.io</a>.
              </p>
              <p className={styles.sectionText}>
                For data protection inquiries, you may also write to us at:
              </p>
              <div className={styles.calloutBox}>
                AutoDM, Inc.<br />
                Attn: Privacy Team<br />
                Email: <a href="mailto:privacy@autodm.io" style={{ color: "#1e40af" }}>privacy@autodm.io</a>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            {/* Brand Col */}
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <div className={styles.footerLogoIcon}>A</div>
                AutoDM
              </div>
              <p className={styles.footerDesc}>
                Enterprise-grade Instagram DM automation. Connect accounts, build keyword triggers,
                and automate messaging workflows at scale.
              </p>
            </div>

            {/* Product Col */}
            <div>
              <h5 className={styles.footerColTitle}>Product</h5>
              <div className={styles.footerLinks}>
                <a href="/" className={styles.footerLink}>Dashboard</a>
                <a href="/automations" className={styles.footerLink}>Automations</a>
                <a href="/analytics" className={styles.footerLink}>Analytics</a>
              </div>
            </div>

            {/* Legal Col */}
            <div>
              <h5 className={styles.footerColTitle}>Legal</h5>
              <div className={styles.footerLinks}>
                <a href="/legal/privacy" className={styles.footerLink}>Privacy Policy</a>
                <a href="/legal/tos" className={styles.footerLink}>Terms of Service</a>
                <a href="/legal/cookies" className={styles.footerLink}>Cookie Statement</a>
                <a href="/legal/dpa" className={styles.footerLink}>Data Processing</a>
              </div>
            </div>

            {/* Support Col */}
            <div>
              <h5 className={styles.footerColTitle}>Support</h5>
              <div className={styles.footerLinks}>
                <a href="mailto:privacy@autodm.io" className={styles.footerLink}>Contact Us</a>
                <a href="mailto:support@autodm.io" className={styles.footerLink}>Help Center</a>
              </div>
            </div>
          </div>

          <hr className={styles.footerDivider} />

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} AutoDM, Inc. All rights reserved.
            </p>
            <div className={styles.footerSocials}>
              <a href="#" className={styles.footerSocialLink} aria-label="Twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" className={styles.footerSocialLink} aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
              <a href="#" className={styles.footerSocialLink} aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
