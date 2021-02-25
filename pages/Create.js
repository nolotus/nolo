import React, {useState} from 'react';
import Template from '../template';
import {CurrentEditor} from '../components/Editor';
import _ from 'lodash';
import {initialValue} from '../components/Editor/currentEditor/constant';
import {dbNew, dbUpdate} from '../common/api';
import {localDb} from '../common/db';
import styled from '@emotion/styled';

const CreateWrapper = styled.div`
  width: 80vw;
  margin: 100px auto;
`;
const Create = () => {
  // if user is save once
  const [_id, setId] = useState();
  const [_rev, setRev] = useState();
  //handle  change
  const onChange = async (value) => {
    console.log('value', value);
    const isSame = _.isEqual(value, initialValue);
    if (!isSame) {
      if (_id) {
        const type = 'article';
        const children = [];
        value.map((doc) => {
          console.log('doc', doc);
          // return {id:belong: [], ...doc};
        });

        let data = {type, children, _id};
        // let res = await dbUpdate(localDb, data);
        res && setRev(res.rev);
      } else {
        const data = {
          type: 'article',
          children: value,
          status: 'draft',
          version: '0.0.2',
        };
        // const res = await dbNew(localDb, data);
        // console.log('res', res);
        // setId(res.id);
      }
    }
  };
  return (
    <Template>
      <CreateWrapper>
        {_rev}
        <CurrentEditor onChange={_.debounce(onChange, 2000)} />
      </CreateWrapper>
    </Template>
  );
};

export default Create;
