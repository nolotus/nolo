export const logOption = {
  onBeforeInput: true,
  compositionUpdate: false,
  compositionStart: false,
  compositionEnd: true,
  onlyShowData: true,
};
export const logFliter = (e, from) => {
  logOption[from]
    ? logOption.onlyShowData
      ? console.log(from, e.data)
      : console.log(from, e)
    : null;
};
