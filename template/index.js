import React from 'react'
import {useSelector} from "react-redux" 

import Simple from './Simple'
const Template = (props) => {
const templateName = useSelector(state => state.templateName)
switch (templateName) {
    case 'simple':
        return <Simple {...props}></Simple>

    default:
        return <Simple {...props}></Simple>
}
}

export default Template
