import React, {useEffect} from 'react';
import PropTypes from 'prop-types';

import {dbGet} from '../../common/api';
import {toHex} from '../../common/tools';
import {linkDb, connectDb} from '../../common/db';

const UserCard = (props) => {
  const {name} = props;
  useEffect(() => {
    const getData = async () => {
      console.log('getData');
      try {
        const result = await dbGet(linkDb.remote, 'org.couchdb.user:' + name);
        console.log('result', result);
        const userDb = connectDb('userdb-' + toHex(name));
        console.log('userDb', userDb);
        const list = await userDb.remote.allDocs({
          include_docs: true,
        });
        console.log('list', list);
        console.log('result', result);
        // result && setList(result.rows);
      } catch (err) {
        console.log(err);
      }
    };
    getData();

    return () => {};
  }, [name]);
  return <div>{name}</div>;
};

export default UserCard;

UserCard.propTypes = {
  name: PropTypes.string.isRequired,
};
