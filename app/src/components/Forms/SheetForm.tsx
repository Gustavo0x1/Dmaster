import { Formik, Field, Form,ErrorMessage } from 'formik';
import react from "react";

interface IValue{
    description: string

}

export const SheetForm:React.FC = ()=>{
    const initalValues: IValue = {
        description:'',
    };
    const onSubmit = (values: IValue)=>{
        console.log('value',values);
    }
    return( <div>

        <Formik initialValues={initalValues} onSubmit={onSubmit}>
        <Form>
            <div>

            <Field name="description" id="description"/>
            <ErrorMessage name="description"/>
            </div>
            <button type='submit'>Save</button>
        </Form>

        </Formik>

    </div>)
}