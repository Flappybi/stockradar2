import { SplashScreen } from "@/components/splash-screen";

export const metadata = { title: "Welcome" };

export default function SplashPage() {
  return <SplashScreen mode={process.env.DATA_MODE ?? "sectors"} />;
}
