import React from 'react'
import Header from '../components/Header'
const simple = (props) => {
    const {children} =props
    console.log('children',children)
    return (
        <>
            <Header/>
            {children}
        </>
    )
}

export default simple
