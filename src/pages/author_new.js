import BrowserOnly from '@docusaurus/BrowserOnly';

export default function AuthorDashboardWrapper() {
  return (
    <BrowserOnly fallback={<div>Loading author dashboard...</div>}>
      {() => <AuthorDashboard />}
    </BrowserOnly>
  );
}
