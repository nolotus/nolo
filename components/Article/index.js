import React, {useState, useEffect} from 'react';
import {CurrentEditor} from '../../components/Editor';
import PropTypes from 'prop-types';
import styled from 'styled-components';
const StyledArticle = styled.div`
  width: 90%;
  max-width: 1050px;
  margin: 3em auto 0;
`;
export const Article = (props) => {
  const {doc, readOnly = true} = props;
  const [content, setcontent] = useState([]);
  useEffect(() => {
    console.log('doc', doc);

    switch (doc.version) {
      case '0.0.2':
        setcontent(doc.content);
        break;

      default:
        setcontent(doc.content);
    }
    return () => {};
  }, [doc]);
  return (
    <StyledArticle>
      <CurrentEditor readOnly={readOnly} value={content} />
    </StyledArticle>
  );
};
Article.propTypes = {
  doc: PropTypes.object,
  readOnly: PropTypes.bool,
};
