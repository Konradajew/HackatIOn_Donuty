import HealIcon from "@/assets/icons/heal.svg";
import { BaseCard } from "./base-card";

export const HealCard = () => {
  return (
    <BaseCard
      type="HEAL"
      topValue="4"
      centerIcon={HealIcon}
      category="MED"
      mainColor="#42EADD"
    />
  );
};
