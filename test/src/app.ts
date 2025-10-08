import { sld } from "solid-html";
import { Badge } from "@kobalte/core/badge";

function Message(props: { message: string }) {
   return props.message
}



const x = sld.define({ Message, Badge }).sld`
   <input class=${"Asdd  "} asd > Hello World!</div>
   <Badge  ></Badge>
   <div children> </div>
   <abbr ></abbr>
   <Show when=${true} keyed=${false} children=${() => "123"} />
   <Message  />
   <Badge  class="123" textValue="123">New</Badge>
   
`;
