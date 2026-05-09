import PoisonIcon from "@/assets/icons/poison.svg";
import { BaseCard } from "./base-card";

export const PoisonCard = () => {
  return (
    <BaseCard
      type="DOT"
      topValue="4"
      centerIcon={PoisonIcon}
      category="CHEM"
      mainColor="#C1FF00"
    />
  );
};
