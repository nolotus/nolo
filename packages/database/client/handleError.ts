import i18n from "app/i18n/client";
export const handleError = (error: Error, handleUnauthorized?: () => void) => {
  let message;
  switch (error.message) {
    case "400":
      message = i18n.t("errors.validationError");
      break;
    case "401":
      message = i18n.t("errors.unauthorized");
      handleUnauthorized && handleUnauthorized();
      break;
    case "500":
    default:
      message = i18n.t("errors.serverError");
      break;
  }

  return message;
};
