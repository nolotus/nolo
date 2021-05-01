import React, {useState} from 'react';
import {View, TextInput} from 'react-native';
import styled from 'styled-components';
import {h1, h2} from '../../common/text';
import _ from 'lodash';
const styleConfig = new Map([
  ['heading-one', h1],
  ['heading-two', h2],
]);
// const getNewId = id => {
//   console.log('id', id);
//   const idArray = id.split('-');
//   const nextId = Number(idArray[idArray.length - 1]) + 1;
//   idArray.splice(-1, 1, nextId);
//   return idArray.join('-');
// };
const StyledTextInput = styled(TextInput)`
  ${props => styleConfig.get(props.type)};
`;
const UselessTextInput = props => {
  return (
    <StyledTextInput
      {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
      editable
    />
  );
};
export const CreateScreen = ({navigation, route}) => {
  const [contentArray, setContentArray] = useState([
    {id: 'local-1-1', value: 'test'},
    {id: 'local-2-1', value: 'test'},
  ]);
  console.log('contentArray', contentArray);

  const keyChange = ({nativeEvent}) => {
    const {key} = nativeEvent;
    console.log('keyChange', key);
    if (key === 'Backspace') {
      console.log('delete');
      //delete
      const nextContentArray = [...contentArray];
      nextContentArray.splice(contentArray.length - 1, 1);
      console.log('nextContentArray', nextContentArray);
      setContentArray(nextContentArray);
    }
  };
  const textChange = (text, id) => {
    return;
    const nextContentArray = [...contentArray];
    _.isEqual();
    console.log('text', text);
    // const nextId = getNewId(id);
    const index = nextContentArray.findIndex(item => item.id === id);
    nextContentArray[index] = {id, value: text};
    // for test
    const textArray = text.split('\n');
    textArray.map(eachLine => {
      const singleLineArray = eachLine.split(' ');
      console.log('singleLineArray', singleLineArray);
      if (singleLineArray[0] && singleLineArray.length > 1) {
        switch (singleLineArray[0]) {
          case '#':
            nextContentArray[index] = {id, value: text, type: 'heading-one'};
            break;
          case '##':
            nextContentArray[index] = {id, value: text, type: 'heading-two'};
            break;
          case '###':
            nextContentArray[index] = {id, value: text, type: 'heading-three'};
            break;
          case '####':
            nextContentArray[index] = {id, value: text, type: 'heading-four'};
            break;
          case '1.':
            nextContentArray[index] = {id, value: text, type: 'heading-one'};
            break;
          default:
            break;
        }
      }
    });
    setContentArray(nextContentArray);
  };
  const selectChange = ({nativeEvent}) => {
    console.log(' selectChange nativeEvent', nativeEvent);
  };
  const submitChange = ({nativeEvent}, index) => {
    console.log(' submitChange nativeEvent', nativeEvent);
    console.log('index', index);
    //insert
    setContentArray([...contentArray, {value: ''}]);
  };
  const onChange = ({nativeEvent}, index) => {
    console.log(' onChange nativeEvent', nativeEvent);
    const {text} = nativeEvent;
    const nextContentArray = [...contentArray];
    nextContentArray[index].value = text;
    console.log('nextContentArray', nextContentArray);
    setContentArray(nextContentArray);
  };
  return (
    <View>
      {contentArray.map((item, index) => {
        const {id, value, type} = item;
        return (
          <UselessTextInput
            key={index}
            onChangeText={text => textChange(text, id)}
            onKeyPress={e => keyChange(e, index)}
            onSelectionChange={e => selectChange(e, index)}
            onSubmitEditing={e => submitChange(e, index)}
            onChange={e => onChange(e, index)}
            blurOnSubmit={false}
            value={value}
            type={type}
          />
        );
      })}
    </View>
  );
};
