import DmgIcon from "@/assets/icons/dmg.svg";
import { BaseCard } from "./base-card";

export const DmgCard = () => {
  return (
    <BaseCard
      type="DMG"
      topValue="4"
      centerIcon={DmgIcon}
      category="MATH"
      mainColor="#FF2A7A"
    />
  );
};
