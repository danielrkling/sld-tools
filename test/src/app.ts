import { sld } from "solid-html";
import { Badge } from "@kobalte/core/badge";

function Message(props: { message: string }) {
   return props.message
}

const x = sld.define({ Message, Badge }).sld`
   <div class123="" asd > Hello World!</div>
   <Show when=${true} keyed=${false} children=${() => "123"} />
   <Message message=${"1"} >
   <Badge class="123" textValue="123">New</Badge>
`;
