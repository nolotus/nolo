import React from "react";
import { CurrentEditor } from "../../components/Editor";
import PropTypes from "prop-types";
export const Article = (props) => {
  const {doc} =props
  console.log('doc',doc)
  return (
      <CurrentEditor
        value={doc.content}
      />
   
  );
};
Article.propTypes = {
  doc: PropTypes.object,
};
