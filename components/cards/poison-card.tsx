import PoisonIcon from "@/assets/icons/poison.svg";
import { BaseCard } from "./base-card";

export const PoisonCard = () => {
  return <BaseCard type="POISON" centerIcon={PoisonIcon} mainColor="#C1FF00" />;
};
