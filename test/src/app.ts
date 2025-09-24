import { sld } from "solid-html";

function Message(props:{message: string}){
   return props.message
}

const x = sld.define({Message}).sld`
   <div class123="" asd > Hello World!</div>
   <Show when=${true} keyed=${false} children=${()=>"123"} />
   <Message message=${"1"} >
`;
