import React from "react";
import { CurrentEditor } from "../../components/Editor";
import PropTypes from "prop-types";
import styled from "styled-components";
const StyledArticle = styled.div`
  width: 90%;
  max-width: 1050px;
  margin: 3em auto 0;
`;
export const Article = (props) => {
  const { doc } = props;
  console.log("doc", doc);
  return (
    <StyledArticle>
      <CurrentEditor value={doc.content} />
    </StyledArticle>
  );
};
Article.propTypes = {
  doc: PropTypes.object,
};