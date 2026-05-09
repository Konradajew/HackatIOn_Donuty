import HideAnsIcon from "@/assets/icons/hide-ans.svg";
import { BaseCard } from "./base-card";

export const HideAnsCard = () => {
  return (
    <BaseCard
      type="HIDE"
      topValue="2"
      centerIcon={HideAnsIcon}
      category="UTIL"
      mainColor="#00BBF9"
    />
  );
};
